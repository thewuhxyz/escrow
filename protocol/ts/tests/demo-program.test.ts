import * as anchor from "@coral-xyz/anchor";
import { DemoProgram, DemoProgramIDLJson, COUNTER_SEEDS } from "../src";
import { sleep } from "./helpers";
import { assert } from "chai";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

describe("demo_program", () => {
	const provider = anchor.AnchorProvider.env();

	const program = new anchor.Program(
		DemoProgramIDLJson as DemoProgram,
		provider
	);

	const user = Keypair.generate();

	const [address, bump] = PublicKey.findProgramAddressSync(
		[Buffer.from("counter"), user.publicKey.toBuffer()],
		program.programId
	);
	
	const connection = provider.connection

	before(async() => {
		const tx = await connection.requestAirdrop(user.publicKey, 1 * LAMPORTS_PER_SOL)

		console.log("✅ transaction successful:", tx)

		await sleep(5)
	})

	it("creates a counter", async () => {

		const tx = await program.methods
			.createCounter()
			.accountsStrict({
				authority: user.publicKey,
				counter: address,
				systemProgram: SystemProgram.programId,
			})
			.signers([user])
			.rpc()

		console.log("✅ transaction successful:", tx);

	})

})
