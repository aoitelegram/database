import crypto from "node:crypto";

function decoding(message: string, key: string) {
  let userKey = crypto.createDecipher("aes-128-cbc", key);
  let text = userKey.update(message, "hex", "utf8");
  text += userKey.final("utf8");
  return text;
}

function cipher(message: string, key: string) {
  let userKey = crypto.createCipher("aes-128-cbc", key);
  let text = userKey.update(message, "utf8", "hex");
  text += userKey.final("hex");
  return text;
}

export { decoding, cipher };
