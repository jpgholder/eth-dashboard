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
import { toast } from "react-toastify";

import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import Typography from "@mui/material/Typography";
import ButtonGroup from "@mui/material/ButtonGroup";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";

export default function NftMintPage() {
  const [activeButton, setActiveButton] = useState(1);

  return (
    <div className="text-xl">
      <Typography variant="h5" mb={5}>
        Mint NFT
      </Typography>
      <FindContract url="/nft/" text={"Collection address"} />
      <Container
        maxWidth="xs"
        sx={{ display: "flex", justifyContent: "center", mb: 6 }}
      >
        <ButtonGroup>
          <Button
            onClick={() => {
              setActiveButton(1);
            }}
            sx={{ maxwidth: "190px", width: "100%" }}
            variant={activeButton === 1 ? "contained" : "outlined"}
          >
            Mint one nft
          </Button>
          <Button
            onClick={() => {
              setActiveButton(2);
            }}
            sx={{ maxwidth: "190px", width: "100%" }}
            variant={activeButton === 2 ? "contained" : "outlined"}
          >
            Create collection
          </Button>
        </ButtonGroup>
      </Container>
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
  const [step, setStep] = useState(1);

  // const [file, setFile] = useState<File | undefined>();
  // const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   setFile(event.target.files?.[0]);
  // };

  const uploadImage = async (image: File): Promise<string> => {
    const formData = new FormData();
    // const image = (
    //   document.getElementById("nft_img") as HTMLInputElement
    // ).files?.item(0);
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
  };

  const uploadMetadata = async (
    name: string,
    description: string,
    imageHash: string
  ): Promise<string> => {
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

  const getMetadata = async ({ name, description, image }: FormProps) => {
    const imageHash = await uploadImage(image);
    const metadata = await uploadMetadata(name, description, imageHash);
    return metadata;
  };

  const sendTx = async (metadata: string) => {
    const tx = await contract?.mint("ipfs://" + metadata);
    addRecentTransaction({
      hash: tx.hash,
      description: "Mint single nft",
    });
    const receipt = await tx.wait();
    return receipt;
  };

  const mint = async (formData: FormProps) => {
    const metadata = await toast.promise(getMetadata(formData), {
      pending: "Pining to ipfs...",
    });
    nftMintAlert(sendTx(metadata));
  };

  interface FormProps {
    name: string;
    description: string;
    image: File;
  }

  const handleSubmit = (formData: FormProps) => {
    mint(formData);
  };

  return (
    <FormContainer onSuccess={handleSubmit}>
      <Container
        sx={{
          display: "flex",
          alignItems: "center",
          flexDirection: "column",
          gap: 3,
        }}
        maxWidth="xs"
      >
        <TextFieldElement label="Name" name="name" required fullWidth />
        <TextFieldElement label="Description" name="description" fullWidth />
        <TextFieldElement
          name="image"
          type="file"
          inputProps={{ accept: "image/*" }}
          hidden
          required
          fullWidth
        />
        {isConnected ? (
          <Button variant="contained" type="submit">
            Submit
          </Button>
        ) : (
          <ConnectButton />
        )}
      </Container>
    </FormContainer>
  );
};
