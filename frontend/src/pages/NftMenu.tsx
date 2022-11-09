import Title from "../utils/components/Title";
import Input from "../utils/components/Input";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import FindContract from "../utils/components/FindContract";
import CollectionFactoryInterface from "../utils/abi/CollectionFactory.json";
import NftMinterInterface from "../utils/abi/NftMinter.json";
import { useSigner, useContract, useAccount } from "wagmi";
import { FormEvent, useState } from "react";
import {
  errorAlert,
  deployedCollectionAlert,
  nftMintAlert,
} from "../utils/components/Popups";
import { ethers } from "ethers";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";

const nonActive = "border rounded border-black p-3 ";
const active = nonActive + "bg-purple-200";

export default function NftMintPage() {
  const [activeButton, setActiveButton] = useState(1);

  return (
    <div className="text-xl">
      <Title text="Mint NFT" />
      <FindContract url="/nft/collection/" text={"Collection address"} />
      <div className="mb-8 flex justify-center gap-6 flex-wrap">
        <button
          className={activeButton === 1 ? active : nonActive}
          onClick={() => {
            setActiveButton(1);
          }}
        >
          Mint one nft
        </button>
        <button
          className={activeButton === 2 ? active : nonActive}
          onClick={() => {
            setActiveButton(2);
          }}
        >
          Create collection
        </button>
      </div>
      <div>{activeButton === 1 ? <MintSingleNft /> : <CreateCollection />}</div>
    </div>
  );
}

const CreateCollection = () => {
  const { isConnected } = useAccount();
  const { data: signer } = useSigner();
  const contract = useContract({
    address: process.env.REACT_APP_NFT_FACTORY_ADDRESS as string,
    abi: CollectionFactoryInterface,
    signerOrProvider: signer,
  });
  const addRecentTransaction = useAddRecentTransaction();

  const getInputValue = (id: string) => {
    const input = document.getElementById(id) as HTMLInputElement;
    return input.value;
  };

  const createCollection = async () => {
    const data = getCollectionData();
    if (data.uri[data.uri.length - 1] !== "/") data.uri += "/";
    const tx: ethers.ContractTransaction = await contract?.createCollection(
      data.name,
      data.symbol,
      data.limit,
      data.supply,
      data.price,
      data.uri
    );
    addRecentTransaction({
      hash: tx.hash,
      description: `Create collection ${data.name}`,
    });
    const txReceipt = await tx.wait();
    if (txReceipt.events) return txReceipt.events[2].args?.collectionAddress;
    else throw new Error("No events have been emitted");
  };

  const getCollectionData = () => {
    return {
      name: getInputValue("collection_name"),
      symbol: getInputValue("collection_symbol"),
      limit: getInputValue("collection_limit"),
      supply: getInputValue("collection_supply"),
      price: ethers.utils.parseUnits(getInputValue("collection_price")),
      uri: getInputValue("collection_uri"),
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isConnected) {
      deployedCollectionAlert(createCollection());
    } else errorAlert("Connect your wallet first!", "wallet-connect");
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-x-1 flex-wrap justify-between max-w-max mx-auto">
        <div>
          <Input text="Name" id="collection_name" className="mb-8" />
          <Input text="Symbol" id="collection_symbol" className="mb-8" />
          <Input
            text="Token price (in ETH)"
            id="collection_price"
            className="mb-8"
            step={1e-18}
            min={0}
            type="number"
          />
        </div>
        <div>
          <Input
            text="User limit"
            id="collection_limit"
            type="number"
            className="mb-8"
          />
          <Input
            text="Max supply"
            id="collection_supply"
            type="number"
            className="mb-8"
          />
        </div>
        <div className="w-full flex flex-col justify-center">
          <label>Base metadata URI</label>
          <input
            className="border border-black p-1 mb-8 box-border"
            type="url"
            id="collection_uri"
            required
          />
          <div className="mx-auto">
            {isConnected ? (
              <button type="submit" className="submit-button">
                Create
              </button>
            ) : (
              <ConnectButton />
            )}
          </div>
        </div>
      </div>
    </form>
  );
};

const MintSingleNft = () => {
  const { isConnected } = useAccount();
  const { data: signer } = useSigner();
  const contract = useContract({
    address: process.env.REACT_APP_NFT_MINTER_ADDRESS as string,
    abi: NftMinterInterface,
    signerOrProvider: signer,
  });
  const addRecentTransaction = useAddRecentTransaction();

  const uploadImage = async (): Promise<string | undefined> => {
    const formData = new FormData();
    const image = (
      document.getElementById("nft_img") as HTMLInputElement
    ).files?.item(0);
    if (image) {
      formData.append("file", image);
      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          body: formData,
          headers: {
            Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT_KEY}`,
          },
        }
      );
      const { IpfsHash } = await response.json();
      return IpfsHash;
    } else {
      throw new Error("No files added!");
    }
  };

  const uploadMetadata = async (imageHash: string): Promise<string> => {
    const name = (document.getElementById("nft_name") as HTMLInputElement)
      .value;
    const description = (
      document.getElementById("nft_description") as HTMLInputElement
    ).value;
    const data = JSON.stringify({
      pinataContent: {
        name,
        description,
        image: "ipfs://" + imageHash,
      },
    });
    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        body: data,
        headers: {
          Authorization: `Bearer ${process.env.REACT_APP_PINATA_JWT_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    const { IpfsHash } = await response.json();
    return IpfsHash;
  };

  const mint = async () => {
    const image = await uploadImage();
    if (image) {
      const metdata = await uploadMetadata(image);
      const tx = await contract?.mint("ipfs://" + metdata);
      addRecentTransaction({
        hash: tx.hash,
        description: "Mint single nft",
      });
      const receipt = await tx.wait();
      return receipt;
    }
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        nftMintAlert(mint());
      }}
    >
      <div className="mx-auto max-w-max">
        <Input text="Name" id="nft_name" className="w-full mb-8" />
        <Input
          text="Description"
          id="nft_description"
          className="w-full mb-8"
        />
        <Input
          text="Image"
          type="file"
          id="nft_img"
          className="w-full mb-8 text-sm"
        />
        {isConnected ? (
          <div className="text-center">
            <button className="submit-button">Create</button>
          </div>
        ) : (
          <div className="flex">
            <div className="mx-auto">
              <ConnectButton />
            </div>
          </div>
        )}
      </div>
    </form>
  );
};
