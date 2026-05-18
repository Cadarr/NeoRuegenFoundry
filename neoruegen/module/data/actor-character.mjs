import NeoruegenActorBase from "./base-actor.mjs";

export default class NeoruegenCharacter extends NeoruegenActorBase {

  static defineSchema() {
    const { NumberField, SchemaField } = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();

    schema.attributes = new SchemaField(Object.keys(CONFIG.NEORUEGEN.attributes).reduce((obj, attribute) => {
      obj[attribute] = new SchemaField({
        value: new NumberField({ ...requiredInteger, initial: 1, min: 1, max: 6 }),
      });
      return obj;
    }, {}));

    schema.skills = new SchemaField(Object.keys(CONFIG.NEORUEGEN.skills).reduce((obj, skill) => {
      obj[skill] = new SchemaField({
        value: new NumberField({ ...requiredInteger, initial: 0, min: 0, max: 4 }),
      });
      return obj;
    }, {}));

    return schema;
  }

  getRollData() {
    return {
      attributes: foundry.utils.deepClone(this.attributes),
      skills: foundry.utils.deepClone(this.skills),
    };
  }
}
