import type { Signer } from "ethers";
import utils from "ethers/lib/utils";
import { GraphQLClient } from "graphql-request";
import { ClassType, nftMap, NftMapTypes, SingleKeys } from "../interfaces";
import { AbstractNFT, PartialNFTItem } from "../nft/AbstractNFT";
import { NFTBuilder, NftBuilderParams } from "../nft/builder/NFTBuilder";
import { Options, RefinableEvmOptions } from "../types/RefinableOptions";
import EvmAccount from "./account/EvmAccount";
import { Contracts } from "./Contracts";
import { RefinableBaseClient } from "./RefinableBaseClient";

export type ContractType =
  | "ERC721_TOKEN"
  | "ERC1155_TOKEN"
  | "ERC721_AUCTION"
  | "ERC1155_AUCTION"
  | "ERC721_SALE"
  | "ERC1155_SALE"
  | "ERC721_SALE_NONCE_HOLDER"
  | "ERC1155_SALE_NONCE_HOLDER"
  | "TRANSFER_PROXY"
  | "ERC721SaleNonceHolder"
  | "ERC1155SaleNonceHolder"
  | "ERC721Airdrop"
  | "ERC1155Airdrop"
  | "ERC721Auction"
  | "ERC1155Auction"
  | "TransferProxy";

export type AllContractTypes =
  | ContractType
  | "ServiceFeeProxy"
  | "ERC20"
  | "RefinableERC721WhiteListedToken"
  | "RefinableERC721WhiteListedTokenV2";

export enum UserItemFilterType {
  Created = "CREATED",
  Owned = "OWNED",
}

export class RefinableEvmClient extends RefinableBaseClient<RefinableEvmOptions> {
  public account: EvmAccount;
  public contracts: Contracts;

  static async getAddress(provider: any): Promise<string> {
    return provider.getAddress();
  }

  static async create(
    provider: Signer,
    apiOrBearerToken: string,
    options?: Options<RefinableEvmOptions>
  ) {
    const accountAddress = await RefinableEvmClient.getAddress(provider);

    const refinable = new RefinableEvmClient(provider, accountAddress, {
      ...options,
      apiOrBearerToken,
    });

    await refinable.init();

    return refinable;
  }

  async init() {
    await this.contracts.initialize();
  }

  constructor(
    public readonly provider: Signer,
    public readonly accountAddress: string,
    options: Options<RefinableEvmOptions & { apiOrBearerToken: string }>
  ) {
    super(options.apiOrBearerToken, options, { waitConfirmations: 3 });

    this.account = new EvmAccount(accountAddress, this);
    this.contracts = new Contracts(this);
  }

  nftBuilder(params?: NftBuilderParams) {
    return new NFTBuilder(this, params);
  }

  setApiClient(client: GraphQLClient) {
    this.apiClient = client;
  }

  async personalSign(message: string) {
    const signature = await this.provider.signMessage(utils.arrayify(message));

    // WARNING! DO NOT remove!
    // this piece of code seems strange, but it fixes a lot of signatures that are faulty due to ledgers
    // ethers includes a lot of logic to fix these incorrect signatures
    // incorrect signatures often end on 00 or 01 instead of 1b or 1c, ethers has support for this
    const pieces = utils.splitSignature(signature);
    const reconstructed = utils.joinSignature(pieces);

    return reconstructed;
  }

  createNft<K extends NftMapTypes>(
    item: PartialNFTItem & { type: SingleKeys<K> }
  ): ClassType<K, AbstractNFT> {
    if (!item) return null;

    const Class = nftMap[item.type as NftMapTypes];

    if (!Class) throw new Error("Item type not supported");

    return new Class(this, item);
  }
}
