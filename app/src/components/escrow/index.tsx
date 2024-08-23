"use client";

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Cluster, PublicKey, Transaction } from "@solana/web3.js";
import { EscrowProgram, truncate } from "@workshop/protocol";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "@/lib/utils";
import {
	QueryFunctionContext,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useSearchParams } from "next/navigation";

export function Escrow() {
	const { allEscrowAddressForWallet } = useEscrow(null);
	const searchParams = useSearchParams()
	const escrow = searchParams.get("address")

	return (
		<section className="flex flex-col items-center  space-y-8">
			<CreateEscrow />
			<Tabs
				defaultValue={escrow ? "take" : "my"}
				className="flex w-full flex-col items-center justify-center space-y-8 max-w-6xl"
			>
				<TabsList className="grid w-[400px] grid-cols-2">
					<TabsTrigger value="my">My Escrow</TabsTrigger>
					<TabsTrigger value="take">Find Escrow</TabsTrigger>
				</TabsList>
				<TabsContent className="w-full" value="my">
					{allEscrowAddressForWallet && allEscrowAddressForWallet.length ? (
						<div className="grid w-full grid-cols-2 items-center gap-4 max-w-6xl">
							{allEscrowAddressForWallet.map((address) => (
								<EscrowCard key={address} address={address}></EscrowCard>
							))}
						</div>
					) : (
						<p className="text-center text-muted-foreground">
							You have not create any escrows yet. Click "Create New Escrow" to
							create a new escrow.
						</p>
					)}
				</TabsContent>
				<TabsContent className="w-full" value="take">
					<TakeEscrow escrow={escrow ?? undefined} />
				</TabsContent>
			</Tabs>
		</section>
	);
}

export function EscrowCard({ address }: { address: string }) {
	const { escrow, take, refund } = useEscrow(new PublicKey(address));
	const { publicKey } = useWallet();

	const isMaker = () =>
		publicKey && escrow?.maker.toBase58() === publicKey.toBase58();
	if (escrow)
		return (
			<Card>
				<CardHeader>
					<CardTitle>Escrow ID: {escrow.seed}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>address: {address}</div>
					<div>creator: {truncate(escrow.maker.toBase58())}</div>
					<div>
						send:{" "}
						{isMaker()
							? `${escrow.balance} ${truncate(escrow.mintA.toBase58())}`
							: `${escrow.receive} ${truncate(escrow.mintB.toBase58())}`}
					</div>
					<div>
						receive:{" "}
						{!isMaker()
							? `${escrow.balance} ${truncate(escrow.mintA.toBase58())}`
							: `${escrow.receive} ${truncate(escrow.mintB.toBase58())}`}
					</div>
					<div>
						link: {`${window.location.origin}/escrow?address=${address}`}
					</div>
				</CardContent>
				<CardFooter>
					<Button
						className="w-full"
						size="sm"
						disabled={!publicKey}
						onClick={() => {
							if (isMaker()) {
								refund({ escrow: new PublicKey(address) });
							} else {
								take({ escrow: new PublicKey(address), taker: publicKey! });
							}
						}}
					>
						{isMaker() ? "Close Escrow" : "Swap"}
					</Button>
				</CardFooter>
			</Card>
		);
}

export function TakeEscrow({escrow}: {escrow?: string}) {
	const [address, setAddress] = useState(escrow ?? "");

	let key: PublicKey | null;

	try {
		key = new PublicKey(address);
	} catch {
		key = null;
	}

	return (
		<div className="my-2 space-y-4 flex flex-col items-center">
			<h1 className="text-bold text-center text-lg">Swap</h1>
			<div className="grid grid-cols-4 items-center gap-4 pb-2 max-w-3xl">
				<Label htmlFor="amount" className="text-right">
					Escrow addresss:
				</Label>
				<Input
					id="amount"
					type="text"
					value={address}
					onChange={(e) => setAddress(e.target.value)}
					className="col-span-3"
				/>
			</div>

			{key && <EscrowCard address={key.toBase58()}></EscrowCard>}
		</div>
	);
}

export function CreateEscrow() {
	const { make } = useEscrow(null);
	const [mintA, setMintA] = useState("");
	const [mintB, setMintB] = useState("");
	const [depositAmount, setDepositAmount] = useState("");
	const [receiveAmount, setReceiveAmount] = useState("");
	const { publicKey } = useWallet();

	return (
		<Popover>
			<PopoverTrigger
				className={cn(
					buttonVariants({
						className: "w-full max-w-sm",
						size: "sm",
					})
				)}
				disabled={!publicKey}
			>
				Create New Escrow
			</PopoverTrigger>
			<PopoverContent className="my-2 space-y-4  max-w-3xl w-full">
				<h1 className="text-bold text-center text-lg">Create Escrow</h1>
				<div className="grid grid-cols-4 items-center gap-4 pb-2">
					<Label htmlFor="amount" className="text-right">
						Deposit mint:
					</Label>
					<Input
						id="amount"
						type="text"
						value={mintA}
						onChange={(e) => setMintA(e.target.value)}
						className="col-span-3"
					/>
				</div>
				<div className="grid grid-cols-4 items-center gap-4 pb-2">
					<Label htmlFor="amount" className="text-right">
						Deposit Amount:
					</Label>
					<Input
						id="amount"
						type="number"
						value={depositAmount}
						onChange={(e) => setDepositAmount(e.target.value)}
						className="col-span-3"
					/>
				</div>
				<div className="grid grid-cols-4 items-center gap-4 pb-2">
					<Label htmlFor="amount" className="text-right">
						Receive mint:
					</Label>
					<Input
						id="amount"
						type="text"
						value={mintB}
						onChange={(e) => setMintB(e.target.value)}
						className="col-span-3"
					/>
				</div>
				<div className="grid grid-cols-4 items-center gap-4 pb-2">
					<Label htmlFor="amount" className="text-right">
						Receive amount:
					</Label>
					<Input
						id="amount"
						type="number"
						value={receiveAmount}
						onChange={(e) => setReceiveAmount(e.target.value)}
						className="col-span-3"
					/>
				</div>

				<div className="flex w-full justify-end">
					<Button
						disabled={!publicKey}
						className="w-full"
						onClick={() => {
							make({
								depositAmount: parseInt(depositAmount),
								receiveAmount: parseInt(receiveAmount),
								maker: publicKey!,
								mintA: new PublicKey(mintA),
								mintB: new PublicKey(mintB),
							});
						}}
						size="sm"
					>
						{publicKey ? "Create" : "Wallet not connected"}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

// export function

export function useEscrow(publicKey: PublicKey | null) {
	const escrowProgram = useEscrowProgram();
	const queryClient = useQueryClient();
	const { connection } = useConnection();
	const wallet = useWallet();

	async function make({
		depositAmount,
		receiveAmount,
		maker,
		mintA,
		mintB,
	}: {
		depositAmount: number;
		receiveAmount: number;
		maker: PublicKey;
		mintA: PublicKey;
		mintB: PublicKey;
	}) {
		const makeIx = await escrowProgram.make({
			depositAmount,
			receiveAmount,
			maker,
			mintA,
			mintB,
		});

		const transaction = new Transaction();

		transaction.feePayer = wallet.publicKey!;
		transaction.instructions = [makeIx];
		transaction.recentBlockhash = (
			await connection.getLatestBlockhash()
		).blockhash;

		return await wallet.sendTransaction(transaction, connection);
	}

	async function take({
		escrow,
		taker,
	}: {
		escrow: PublicKey;
		taker: PublicKey;
	}) {
		const takeIx = await escrowProgram.take({
			escrow,
			taker,
		});

		const transaction = new Transaction();

		transaction.feePayer = wallet.publicKey!;
		transaction.instructions = [takeIx];
		transaction.recentBlockhash = (
			await connection.getLatestBlockhash()
		).blockhash;

		return await wallet.sendTransaction(transaction, connection);
	}

	async function refund({ escrow }: { escrow: PublicKey }) {
		const refundIx = await escrowProgram.refund({
			escrow,
		});

		const transaction = new Transaction();

		transaction.feePayer = wallet.publicKey!;
		transaction.instructions = [refundIx];
		transaction.recentBlockhash = (
			await connection.getLatestBlockhash()
		).blockhash;

		return await wallet.sendTransaction(transaction, connection);
	}

	const { data: allEscrowAddressForWallet } = useQuery({
		queryKey: [
			"all-escrows",
			{ publicKey: wallet.publicKey?.toBase58() ?? null },
		],
		queryFn: ({
			queryKey,
		}: QueryFunctionContext<[string, { publicKey: string | null }]>) => {
			const [_, { publicKey }] = queryKey;
			return publicKey
				? escrowProgram
						.getAllEscrowAddressesFor(new PublicKey(publicKey))
						.then((pks) => pks.map((pk) => pk.toBase58()))
				: null;
		},
	});

	const { data, error, isLoading } = useQuery({
		queryKey: ["escrow", { publicKey: publicKey?.toBase58() ?? null }],
		queryFn: ({
			queryKey,
		}: QueryFunctionContext<[string, { publicKey: string | null }]>) => {
			const [_, { publicKey }] = queryKey;
			return publicKey
				? escrowProgram.getEscrowAccount(new PublicKey(publicKey))
				: null;
		},
	});

	const invalidateEscrow = (publicKey?: PublicKey) => {
		queryClient.invalidateQueries({
			queryKey: ["escrow", { publicKey: publicKey }],
			refetchType: "all",
		});
	};

	const invalidateEscrowAddressses = () => {
		queryClient.invalidateQueries({
			queryKey: ["all-escrows", { publicKey: wallet.publicKey }],
			refetchType: "all",
		});
	};

	const makeMutation = useMutation({
		mutationFn: make,
		onSuccess: (tx) => {
			invalidateEscrowAddressses();
			toast.success("Escrow created successfully!", {
				action: <GoToExplorer tx={tx} cluster="custom" />,
				className: "w-max",
			});
		},
		onError: (e) => {
			console.error("error:", e);
			toast.error(`Error making escrow. ${e.message}`);
		},
	});

	const takeMutation = useMutation({
		mutationFn: take,
		onSuccess: (tx, { escrow }) => {
			invalidateEscrow(escrow);
			invalidateEscrowAddressses();
			toast.success("Escrow withdrawn successfully!", {
				action: <GoToExplorer tx={tx} cluster="custom" />,
				className: "w-max",
			});
		},
		onError: (e) => {
			console.error("error:", e);
			toast.error(`Error taking from escrow. ${e.message}`);
		},
	});

	const refundMutation = useMutation({
		mutationFn: refund,
		onSuccess: (tx, { escrow }) => {
			invalidateEscrow(escrow);
			invalidateEscrowAddressses();
			toast.success("Escrow closed successfully!", {
				action: <GoToExplorer tx={tx} cluster="custom" />,
				className: "w-max",
			});
		},
		onError: (e) => {
			console.error("error:", e);
			toast.error(`Error taking from escrow. ${e.message}`);
		},
	});

	return {
		escrow: data,
		error,
		isLoading,
		invalidateEscrow,
		invalidateEscrowAddressses,
		make: makeMutation.mutate,
		take: takeMutation.mutate,
		refund: refundMutation.mutate,
		allEscrowAddressForWallet,
	};
}

export function useEscrowProgram() {
	const { connection } = useConnection();
	const { publicKey, signTransaction, signAllTransactions } = useWallet();

	const wallet = (): Wallet => {
		if (!publicKey || !signTransaction || !signAllTransactions) {
			return {} as Wallet;
		}
		return {
			publicKey,
			signTransaction,
			signAllTransactions,
		} as Wallet;
	};

	const provider = new AnchorProvider(connection, wallet(), {});

	return new EscrowProgram(provider);
}

function GoToExplorer({
	tx,
	cluster,
}: {
	tx: string;
	cluster: Cluster | "custom";
}) {
	const explorer = `https://explorer.solana.com/tx/${tx}?cluster=${cluster}`;
	return (
		<a href={explorer} className={cn(buttonVariants({ size: "sm" }))}>
			See Explorer
		</a>
	);
}
