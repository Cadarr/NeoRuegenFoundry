import NeoruegenDataModel from "./base-model.mjs";

export default class NeoruegenActorBase extends NeoruegenDataModel {

  static defineSchema() {
    const { HTMLField, NumberField, SchemaField } = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };

    return {
      health: new SchemaField({
        value: new NumberField({ ...requiredInteger, initial: 10, min: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 10, min: 0 })
      }),
      power: new SchemaField({
        value: new NumberField({ ...requiredInteger, initial: 5, min: 0 }),
        max: new NumberField({ ...requiredInteger, initial: 5, min: 0 })
      }),
      biography: new HTMLField({ required: true, blank: true })
    };
  }

}
