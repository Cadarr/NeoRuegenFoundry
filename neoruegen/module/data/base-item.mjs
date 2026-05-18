import NeoruegenDataModel from "./base-model.mjs";

export default class NeoruegenItemBase extends NeoruegenDataModel {

  static defineSchema() {
    const { HTMLField } = foundry.data.fields;

    return {
      description: new HTMLField({ required: true, blank: true })
    };
  }

}
