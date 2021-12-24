import { Transaction } from "@metaplex-foundation/mpl-core";
import {
  ExternalPriceAccountData,
  UpdateExternalPriceAccount,
  Vault,
  VaultProgram,
} from "@metaplex-foundation/mpl-token-vault";
import { Wallet } from "@metaplex/js";
import { actions } from "@metaplex/js";
import { NATIVE_MINT } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionCtorFields,
} from "@solana/web3.js";
import BN from "bn.js";
import { TransactionsBatch } from "../../SOLNFT";
import { TxSets } from "../connection";

interface CreateExternalPriceAccountParams {
  connection: Connection;
  wallet: Wallet;
}

// This command creates the external pricing oracle
export const createExternalPriceAccount = async (
  { connection, wallet }: CreateExternalPriceAccountParams,
  txSets: TxSets
) => {
  const txBatch = new TransactionsBatch({ transactions: [] });
  const txOptions: TransactionCtorFields = { feePayer: wallet.publicKey };

  const epaRentExempt = await connection.getMinimumBalanceForRentExemption(
    Vault.MAX_EXTERNAL_ACCOUNT_SIZE
  );

  const externalPriceAccount = Keypair.generate();

  const externalPriceAccountData = new ExternalPriceAccountData({
    pricePerShare: new BN(0),
    priceMint: NATIVE_MINT.toBase58(),
    allowedToCombine: true,
  });

  const uninitializedEPA = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: externalPriceAccount.publicKey,
      lamports: epaRentExempt,
      space: Vault.MAX_EXTERNAL_ACCOUNT_SIZE,
      programId: VaultProgram.PUBKEY,
    })
  );
  txBatch.addTransaction(uninitializedEPA);
  txBatch.addSigner(externalPriceAccount);

  const updateEPA = new UpdateExternalPriceAccount(txOptions, {
    externalPriceAccount: externalPriceAccount.publicKey,
    externalPriceAccountData,
  });
  txBatch.addTransaction(updateEPA);

  // Save to array for batch
  txSets.instructions.push(txBatch.toInstructions());
  txSets.signers.push(txBatch.signers);

  return {
    externalPriceAccount: externalPriceAccount.publicKey,
    priceMint: NATIVE_MINT,
  };
};
