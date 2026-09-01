// Os ids vêm do Prisma como BigInt (BigAutoField do Django) e JSON.stringify
// lança "Do not know how to serialize a BigInt" sem isto.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (this: bigint) {
  return this.toString();
};

export {};
