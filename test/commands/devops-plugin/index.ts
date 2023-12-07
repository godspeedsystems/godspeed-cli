import { pluginAdd } from "./add";
import { pluginRemove } from "./remove";

export const devopsPlugin = () => {
  pluginAdd();
  pluginRemove();
};
