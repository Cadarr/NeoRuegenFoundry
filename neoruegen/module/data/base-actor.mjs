import NeoruegenDataModel from "./base-model.mjs";

export default class NeoruegenActorBase extends NeoruegenDataModel {

  static defineSchema() {
    const { HTMLField } = foundry.data.fields;

    return {
      biography: new HTMLField({ required: true, blank: true })
    };
  }

}
