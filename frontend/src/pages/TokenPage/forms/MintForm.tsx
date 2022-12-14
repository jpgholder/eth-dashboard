import { ethers, BigNumber } from "ethers";
import { useAccount } from "wagmi";
import { txAlert } from "../../../utils/components/Popups";
import { useContext } from "react";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { TokenContext } from "..";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import { FormContainer, TextFieldElement, useForm } from "react-hook-form-mui";
import Button from "@mui/material/Button";
import { Grid, InputAdornment } from "@mui/material";
// import { MainWidthContext } from "../../../App";

interface FormData {
  address: string;
  amount: string;
}

const MintForm = () => {
  const { address } = useAccount();
  const { token, tokenData, refetch } = useContext(TokenContext);
  const addRecentTransaction = useAddRecentTransaction();
  const formContext = useForm<FormData>();

  const mintTokens = async (address: string, amount: BigNumber) => {
    const tx: ethers.ContractTransaction = await token?.mintTo(address, amount);
    addRecentTransaction({
      hash: tx.hash,
      description: `Mint ${ethers.utils.formatUnits(amount)} ${
        tokenData?.symbol
      }`,
    });
    await tx.wait();
    refetch?.();
    return tx.hash;
  };

  const handleMint = (data: FormData) => {
    console.log(data);
    txAlert(
      `Successfully minted ${data.amount} ${tokenData?.symbol}`,
      mintTokens(data.address, ethers.utils.parseEther(data.amount))
    );
  };

  if (tokenData?.owner !== address) return null;
  else
    return (
      <Box>
        <Divider sx={{ mb: 2 }} />
        <FormContainer formContext={formContext} onSuccess={handleMint}>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} sm={6} md={5}>
              <TextFieldElement
                label="Mint to"
                name="address"
                required
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ fontSize: "0.7rem" }}
                        onClick={() => {
                          formContext.setValue(
                            "address",
                            address ?? ethers.constants.AddressZero
                          );
                          formContext.trigger("address");
                        }}
                      >
                        Current
                      </Button>
                    </InputAdornment>
                  ),
                }}
                validation={{
                  validate: (s) =>
                    ethers.utils.isAddress(s)
                      ? true
                      : "Not an ethereum address!",
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextFieldElement
                label="Mint amount"
                name="amount"
                type="number"
                required
                fullWidth
                inputMode="decimal"
                validation={{
                  min: {
                    value: 10 ** -(tokenData?.decimals ?? 18),
                    message: "Must be greater than 0",
                  },
                }}
                inputProps={{
                  min: 1,
                }}
              />
            </Grid>
            <Grid item xs={12} sm="auto">
              <Button
                type="submit"
                variant="contained"
                sx={{ height: "56px", width: "100px" }}
              >
                Mint
              </Button>
            </Grid>
          </Grid>
        </FormContainer>
      </Box>
    );
};

export default MintForm;
