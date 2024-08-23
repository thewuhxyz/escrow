import { SystemProgram } from "@solana/web3.js";

async function main()  {
  SystemProgram.transfer({
    fromPubkey,
    lamports,
    toPubkey
  })
}