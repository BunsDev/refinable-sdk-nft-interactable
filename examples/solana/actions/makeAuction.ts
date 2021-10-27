import { Keypair, TransactionInstruction } from '@solana/web3.js';
import {
  IPartialCreateAuctionArgs,
  CreateAuctionArgs,
  WalletSigner,
} from '../oyster';
import {
  AUCTION_PREFIX,
  createAuction,
} from '../oyster';
import { findProgramAddress, programIds, StringPublicKey, toPublicKey } from '../utils';

// This command makes an auction
export async function makeAuction(
  wallet: WalletSigner,
  vault: StringPublicKey,
  auctionSettings: IPartialCreateAuctionArgs,
): Promise<{
  auction: StringPublicKey;
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new Error('Wallet not connected');

  const PROGRAM_IDS = programIds();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];
  const auctionKey = (
    await findProgramAddress(
      [
        Buffer.from(AUCTION_PREFIX),
        toPublicKey(PROGRAM_IDS.auction).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.auction),
    )
  )[0];

  const fullSettings = new CreateAuctionArgs({
    ...auctionSettings,
    authority: wallet.publicKey.toBase58(),
    resource: vault,
  });

  createAuction(fullSettings, wallet.publicKey.toBase58(), instructions);

  return { instructions, signers, auction: auctionKey };
}
