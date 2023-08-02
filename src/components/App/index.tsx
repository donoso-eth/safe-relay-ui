import { useEffect, useState } from "react";
import { Status, State, DedicatedMsgSender, Chain } from "../../types/Status";

import { ethers } from "ethers";
import metamask from "../../assets/images/metamask.png";
import Header from "../Header";

import "./style.css";
import { AutomateSDK } from "@gelatonetwork/automate-sdk";
import Action from "../Action";
import Loading from "../Loading";
import Button from "../Button";
import { CallWithERC2771Request, GelatoRelay } from "@gelatonetwork/relay-sdk";


const GELATO_RELAY_API_KEY = ""

const App = () => {
  // these could potentially be unified into one provider
  // provider will initially be the static JsonRpcProvider (read-only)
  // once a wallet is connected it will be set to the WalletProvider (can sign)

  const [ready, setReady] = useState(false);

  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [signerAddress, setSignerAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<Chain>({ name: "", id: 0 });

  const [max, setMax] = useState<boolean>(false);
  const [connectStatus, setConnectStatus] = useState<Status | null>({
    state: State.missing,
    message: "Loading",
  });

  const onConnect = async () => {
    console.log("connec");
    try {
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [
          {
            eth_accounts: {},
          },
        ],
      });
    } catch (error) {}
  };

  const onDisconnect = async () => {
    setConnectStatus({
      state: State.failed,
      message: "Waiting for Disconnection",
    });

    await window.ethereum.request({
      method: "eth_requestAccounts",
      params: [
        {
          eth_accounts: {},
        },
      ],
    });
  };

  const onCopy = async (text: string) => {
    if ("clipboard" in navigator) {
      await navigator.clipboard.writeText(text);
    } else {
      document.execCommand("copy", true, text);
    }
    alert("Copied to Clipboard");
  };

  const onAction = async (action: number) => {
    setLoading(true);
    switch (action) {
      case 0:
        relayCall();
        break;
      case 1:
        break;

      default:
        setLoading(false);
        break;
    }
  };

  const relayCall = async () => {
    console.log("relay");
    const relay = new GelatoRelay();
    const counter = "0x00172f67db60E5fA346e599cdE675f0ca213b47b";
    const abi = ["function increment()"];
    //const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = await provider!.getSigner();
    const user = await signer.getAddress();

    const chainId = (await provider!.getNetwork()).chainId;

    // Generate the target payload
    const contract = new ethers.Contract(counter, abi, signer);
    const { data } = await contract.populateTransaction.increment();

    // Populate a relay request
    const request: CallWithERC2771Request = {
      chainId,
      target: counter,
      data: data as string,
      user: user as string,
    };

    // Without a specific API key, the relay request will fail!
    // Go to https://relay.gelato.network to get a testnet API key with 1Balance.
    // Send a relay request using Gelato Relay!
  

    const response = await relay.sponsoredCallERC2771(
      request,
      provider!,
      GELATO_RELAY_API_KEY as string
    );

    console.log(`https://relay.gelato.digital/tasks/status/${response.taskId}`);
    setLoading(false);
  };

  const doRefresh = async () => {
    await refresh(provider!);
  };

  const refresh = async (provider: ethers.providers.Web3Provider) => {
    setProvider(provider);

    const chain = await provider.getNetwork();
    setChainId({ name: chain.name, id: chain.chainId });

    const addresses = await provider.listAccounts();

    if (addresses.length > 0) {
      const signer = await provider?.getSigner();
      const signerAddress = (await signer?.getAddress()) as string;
      setSignerAddress(signerAddress);
      setSigner(signer);
      setConnectStatus({
        state: State.success,
        message: "Connection Succed",
      });

      setLoading(false);
    } else {
      setLoading(false);
      setConnectStatus({ state: State.failed, message: "Connection Failed" });
    }

    //
    // console.log(signer);
  };

  const onUpdate = async (value: number, action: number) => {};

  useEffect(() => {
    (async () => {
      if (provider != null) {
        return;
      }
      if (window.ethereum == undefined) {
        setLoading(false);
      } else {
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        refresh(web3Provider);
      }
    })();
  }, []);

  return (
    <div className="App">
      <div className="container">
        <Header
          status={connectStatus}
          ready={ready}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          signerAddress={signerAddress}
        />
        {connectStatus?.state! == State.success && (
          <div>
            {loading && <Loading />}
            <main>
              <div className="flex">
                <p className="title">
                  Chain: {chainId.name} {chainId.id}{" "}
                </p>
        
                <div>
                  <div className="isDeployed">
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "center",
                      }}
                    >
                      <Action
                        ready={ready}
                        onClick={onAction}
                        onUpdate={onUpdate}
                        text="Relay"
                        action={0}
                        max={max}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </div>
        )}{" "}
        {connectStatus?.state! == State.missing && (
          <p style={{ textAlign: "center" }}>Metamask not Found</p>
        )}
        {(connectStatus?.state == State.pending ||
          connectStatus?.state == State.failed) && (
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            <h3> Please connect your metamask</h3>
            <Button status={connectStatus} ready={ready} onClick={onConnect}>
              <img src={metamask} width={25} height={25} />{" "}
              <span style={{ position: "relative", top: "-6px" }}>
                Connect{" "}
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
