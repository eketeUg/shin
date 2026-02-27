'use client';

import React, { useMemo, useState, useEffect, createContext, useContext } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork, Adapter } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAuthorizationResultCache, createDefaultAddressSelector, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { UmiProvider } from './UmiProvider';

// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

interface NetworkContextState {
    network: WalletAdapterNetwork;
    setNetwork: (network: WalletAdapterNetwork) => void;
}

const NetworkContext = createContext<NetworkContextState>({} as NetworkContextState);

export const useNetwork = () => useContext(NetworkContext);

function BoltSync() {
    const { connection } = useConnection();
    const wallet = useWallet();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).bolt = { connection, wallet };
        }
    }, [connection, wallet]);

    return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [network, setNetwork] = useState<WalletAdapterNetwork>(WalletAdapterNetwork.Devnet);

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => {
        if (network === WalletAdapterNetwork.Mainnet) return clusterApiUrl(network);
        if (network === WalletAdapterNetwork.Devnet) return "https://devnet.helius-rpc.com/?api-key=a2b67de4-de35-4629-ac8c-20c919c6e7d5";
        return "http://127.0.0.1:8899"; // Localnet
    }, [network]);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            setIsMobile(isMob);
        }
    }, []);

    const mwa = useMemo(() => new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
            name: 'SHIN: The Struggle',
            uri: typeof window !== 'undefined' ? window.location.origin : 'https://shin-hazel.vercel.app', 
            icon: '/favicon.ico',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: network,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
    }), [network]);

    const wallets = useMemo(
        () => {
            // Prevent desktop extensions from showing on mobile browsers (like Chrome) 
            // where they just prompt app downloads, EXCEPT if we are inside their In-App Browsers.
            const isPhantomInjected = typeof window !== 'undefined' && (window as any).phantom?.solana;
            const isSolflareInjected = typeof window !== 'undefined' && (window as any).solflare;

            const finalWallets: Adapter[] = [mwa];
            
            if (!isMobile || isPhantomInjected) {
                finalWallets.push(new PhantomWalletAdapter());
            }
            if (!isMobile || isSolflareInjected) {
                finalWallets.push(new SolflareWalletAdapter());
            }

            return finalWallets;
        },
        [isMobile, mwa]
    );

    return (
        <NetworkContext.Provider value={{ network, setNetwork }}>
            <ConnectionProvider endpoint={endpoint}>
                <WalletProvider wallets={wallets} autoConnect>
                    <BoltSync />
                    <UmiProvider>
                        <WalletModalProvider>{children}</WalletModalProvider>
                    </UmiProvider>
                </WalletProvider>
            </ConnectionProvider>
        </NetworkContext.Provider>
    );
}
