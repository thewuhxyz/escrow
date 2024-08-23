import * as anchor from "@coral-xyz/anchor";
import { sleep } from "./helpers";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
	createMint,
	getAssociatedTokenAddressSync,
	getOrCreateAssociatedTokenAccount,
	mintToChecked,
	// TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

describe("airdrop", () => {
	const provider = anchor.AnchorProvider.env();

	const mintAuthority = Keypair.generate();

	function getAtaAddress(mint: PublicKey, authority: PublicKey): PublicKey {
		return getAssociatedTokenAddressSync(new PublicKey(mint), authority, true);
	}

	async function getAta(mint: PublicKey, authority: PublicKey) {
		return await getOrCreateAssociatedTokenAccount(
			connection,
			mintAuthority,
			mint,
			authority,
			true
		);
	}

	let connection = provider.connection;

	before(async () => {
		console.log("---- airdroping token ----");

		let tx = await provider.connection.requestAirdrop(
			mintAuthority.publicKey,
			0.1 * anchor.web3.LAMPORTS_PER_SOL
		);
		console.log("✅ Transaction successful", tx);
		await sleep(3);

		const balance = await connection.getBalance(mintAuthority.publicKey);

		console.log("balance:", balance / LAMPORTS_PER_SOL);
	});

	it("creates mint: 6 decimals", async () => {
		let decimals = 6;

		const mint = await createMint(
			provider.connection,
			mintAuthority,
			mintAuthority.publicKey,
			null,
			decimals,
		);
		console.log("mint created:", mint.toBase58());

		await sleep(3);

		const to = new PublicKey("neu8TtbzP36kxRsZ97uq6s6avYu8wviMApTLvJ3vge3");

		const balance = await connection.getBalance(to);

		console.log("balance:", balance / LAMPORTS_PER_SOL);

		const to_ata = await getAta(mint, to);

		// console.log("token balance:", to_ata)

		await sleep(3);

		const tx = await mintToChecked(
			connection,
			mintAuthority,
			mint,
			to_ata.address,
			mintAuthority,
			100 * 10 ** decimals,
			decimals,
		);

		console.log("✅ Transaction successful", tx);
		await sleep(3);
	});

	it("creates mint: 8 decimals", async () => {
		let decimals = 8;

		const mint = await createMint(
			connection,
			mintAuthority,
			mintAuthority.publicKey,
			null,
			decimals,
		);
		console.log("mint created:", mint.toBase58());

		await sleep(3);

		const to = new PublicKey("Ca2rS3YvRKqB7KbNs2rSBRRjKDTzzhn83grgKF6Ua9Bn");

		const balance = await connection.getBalance(to);

		console.log("balance:", balance / LAMPORTS_PER_SOL);

		const to_ata = await getAta(mint, to);

		await sleep(3);

		const tx = await mintToChecked(
			provider.connection,
			mintAuthority,
			mint,
			to_ata.address,
			mintAuthority,
			100 * 10 ** decimals,
			decimals,
		);

		console.log("✅ Transaction successful", tx);
		await sleep(3);
	});
});
