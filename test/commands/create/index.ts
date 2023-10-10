import { defaultCreate } from "./default";
import { helloWorld } from "./hello-world";
import { mongoAsPrisma } from "./mongo-as-prisma";

export const create = () => {
  defaultCreate();
  helloWorld();
  mongoAsPrisma();
};
