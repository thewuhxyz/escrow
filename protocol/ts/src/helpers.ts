import BN from "bn.js";

export function toUiAmount(amount: BN, decimals: number): number {
	return amount.div(new BN(10 ** decimals)).toNumber();
}

export function toAmount(amount: number, decimals: number): BN {
	return new BN(amount * 10 ** decimals);
}

export const truncate = (str: string, len: number = 10) => {
	return str.length > len
		? `${str.slice(0, Math.floor(len / 2))}...${str.slice(
				Math.floor(str.length - len / 2)
		  )}`
		: str;
};