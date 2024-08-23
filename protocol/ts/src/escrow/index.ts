import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { AnchorEscrow, AnchorEscrowIDLJson } from "../idl";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import BN from "bn.js";
import {
	getAssociatedTokenAddressSync,
	getMint,
	getOrCreateAssociatedTokenAccount,
	Mint,
	TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { toAmount, toUiAmount } from "../helpers";

export class EscrowProgram {
	program: Program<AnchorEscrow>;

	constructor(public provider: AnchorProvider) {
		this.program = new Program(AnchorEscrowIDLJson as AnchorEscrow, provider);
	}

	get connection() {
		return this.provider.connection;
	}

	////////////////////////////////////////////////////////
	// client
	/////////////////////////////////////////////////////////
	async make({
		depositAmount,
		receiveAmount,
		maker,
		mintA,
		mintB,
	}: {
		depositAmount: number;
		receiveAmount: number;
		maker: PublicKey;
		mintA: PublicKey;
		mintB: PublicKey;
	}): Promise<TransactionInstruction> {
		// const depositMint = await this.getMintAccount(mintA, TOKEN_2022_PROGRAM_ID);
		// const receiveMint = await this.getMintAccount(mintB, TOKEN_2022_PROGRAM_ID);

		const depositMint = await this.getMintAccount(mintA, TOKEN_PROGRAM_ID);
		const receiveMint = await this.getMintAccount(mintB, TOKEN_PROGRAM_ID);

		const seed = Math.floor(Math.random() * 999_999_999_999_999);

		return this.makeInstruction({
			seed: new BN(seed),
			deposit: toAmount(depositAmount, depositMint.decimals),
			receive: toAmount(receiveAmount, receiveMint.decimals),
			maker,
			mintA,
			mintB,
		});
	}

	async take({
		escrow,
		taker,
	}: {
		escrow: PublicKey;
		taker: PublicKey;
	}): Promise<TransactionInstruction> {
		const escrowAccount = await this.getEscrowAccount(escrow);

		if (!escrowAccount) throw "escrow account not found";

		return this.takeInstruction({
			escrow,
			maker: escrowAccount.maker,
			taker,
			mintA: escrowAccount.mintA,
			mintB: escrowAccount.mintB,
		});
	}

	async refund({
		escrow,
	}: {
		escrow: PublicKey;
	}): Promise<TransactionInstruction> {
		const escrowAccount = await this.getEscrowAccount(escrow);

		if (!escrowAccount) throw "escrow account not found";

		return this.refundInstruction({
			escrow,
			maker: escrowAccount.maker,
			mintA: escrowAccount.mintA,
		});
	}

	////////////////////////////////////////////////////////
	// instructions
	/////////////////////////////////////////////////////////
	async makeInstruction({
		seed,
		deposit,
		receive,
		maker,
		mintA,
		mintB,
	}: {
		seed: BN;
		deposit: BN;
		receive: BN;
		maker: PublicKey;
		mintA: PublicKey;
		mintB: PublicKey;
	}): Promise<TransactionInstruction> {
		return (
			this.program.methods
				.make(seed, deposit, receive)
				.accounts({ maker, mintA, mintB, tokenProgram: TOKEN_PROGRAM_ID })
				// .accounts({ maker, mintA, mintB, tokenProgram: TOKEN_2022_PROGRAM_ID })
				.instruction()
		);
	}

	async takeInstruction({
		escrow,
		maker,
		taker,
		mintA,
		mintB,
	}: {
		escrow: PublicKey;
		maker: PublicKey;
		taker: PublicKey;
		mintA: PublicKey;
		mintB: PublicKey;
	}): Promise<TransactionInstruction> {
		return this.program.methods
			.take()
			.accountsPartial({
				tokenProgram: TOKEN_PROGRAM_ID,
				// tokenProgram: TOKEN_2022_PROGRAM_ID,
				taker,
				mintA,
				mintB,
				maker,
				escrow,
			})
			.instruction();
	}

	async refundInstruction({
		escrow,
		maker,
		mintA,
	}: {
		escrow: PublicKey;
		maker: PublicKey;
		mintA: PublicKey;
	}): Promise<TransactionInstruction> {
		return this.program.methods
			.refund()
			.accountsPartial({
				tokenProgram: TOKEN_PROGRAM_ID,
				// tokenProgram: TOKEN_2022_PROGRAM_ID,
				mintA,
				maker,
				escrow,
			})
			.instruction();
	}

	////////////////////////////////////////////////////////
	// accounts
	/////////////////////////////////////////////////////////
	async getEscrowAccount(address: PublicKey): Promise<Escrow | null> {
		const escrow = await this.program.account.escrow.fetchNullable(address);
		if (escrow === null) return escrow;
		const receiveMint = await this.getMintAccount(
			escrow.mintB,
			// TOKEN_2022_PROGRAM_ID
			TOKEN_PROGRAM_ID
		);

		const balance = (await this.connection.getTokenAccountBalance(this.getAtaAddress(escrow.mintA, address))).value.uiAmount ?? 0

		return {
			...escrow,
			receive: toUiAmount(escrow.receive, receiveMint.decimals),
			seed: escrow.seed.toNumber(),
			balance
		};
	}

	async getAllEscrowAddressesFor(owner: PublicKey): Promise<PublicKey[]> {
		return (
			await this.program.account.escrow.all([
				{
					memcmp: {
						offset: 8 + 8, // discriminator (8 bytes) + seeds (u64 - 8 bytes)
						bytes: owner.toBase58(),
					},
				},
			])
		).map((p) => p.publicKey);
	}

	////////////////////////////////////////////////////////
	// helpers
	/////////////////////////////////////////////////////////
	async getMintAccount(
		mint: PublicKey,
		tokenProgram: PublicKey
	): Promise<Mint> {
		return getMint(this.connection, mint, undefined, tokenProgram);
	}

	getAtaAddress(mint: PublicKey, owner: PublicKey): PublicKey {
		return getAssociatedTokenAddressSync(mint, owner, true);
	}
}

export type Escrow = {
	bump: number;
	maker: PublicKey;
	mintA: PublicKey;
	mintB: PublicKey;
	receive: number;
	seed: number;
	balance: number
};
