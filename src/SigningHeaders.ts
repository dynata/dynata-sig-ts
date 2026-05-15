import {
  HeaderDynataAccessKey,
  HeaderDynataExpiration,
  HeaderDynataSignature
} from "./DynataHeaderConstants.js";

type HeaderCarrier =
  | Headers
  | { set(name: string, value: string): unknown }
  | { setHeader(name: string, value: string): unknown }
  | Record<string, string>;

export class SigningHeaders {
  public readonly dynataExpiration: string;
  public readonly dynataAccessKey: string;
  public readonly dynataSignature: string;
  public readonly dynataSigningString: string;

  public constructor(input: {
    dynataExpiration: string;
    dynataAccessKey: string;
    dynataSignature: string;
    dynataSigningString: string;
  }) {
    this.dynataExpiration = input.dynataExpiration;
    this.dynataAccessKey = input.dynataAccessKey;
    this.dynataSignature = input.dynataSignature;
    this.dynataSigningString = input.dynataSigningString;
  }

  public applyHeaders(target: HeaderCarrier): void {
    if (!target) {
      throw new Error("target must not be nil");
    }

    if ("set" in target && typeof target.set === "function") {
      target.set(HeaderDynataAccessKey, this.dynataAccessKey);
      target.set(HeaderDynataSignature, this.dynataSignature);
      target.set(HeaderDynataExpiration, this.dynataExpiration);
      return;
    }

    if ("setHeader" in target && typeof target.setHeader === "function") {
      target.setHeader(HeaderDynataAccessKey, this.dynataAccessKey);
      target.setHeader(HeaderDynataSignature, this.dynataSignature);
      target.setHeader(HeaderDynataExpiration, this.dynataExpiration);
      return;
    }

    const recordTarget = target as Record<string, string>;
    recordTarget[HeaderDynataAccessKey] = this.dynataAccessKey;
    recordTarget[HeaderDynataSignature] = this.dynataSignature;
    recordTarget[HeaderDynataExpiration] = this.dynataExpiration;
  }

  public toObject(): Record<string, string> {
    return {
      [HeaderDynataAccessKey]: this.dynataAccessKey,
      [HeaderDynataSignature]: this.dynataSignature,
      [HeaderDynataExpiration]: this.dynataExpiration
    };
  }
}
