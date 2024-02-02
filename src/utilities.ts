import { ObjectType, ObjectField, Type } from "@hasura/ndc-sdk-typescript";
import { RESTRICTED_NAMES } from "./constants";

const recursiveType = (val: any, namePrefix: string, objTypes: { [k: string]: ObjectType }): Type => {
    const wrapNull = (x: Type): Type => ({
      type: "nullable",
      underlying_type: x,
    });
  
    if (Array.isArray(val)) {
      const new_val = val.length === 0 ? "str" : val[0];
      return wrapNull({
        type: "array",
        element_type: recursiveType(new_val, namePrefix, objTypes),
      });
    } else if (typeof val === "boolean") {
      return wrapNull({
        type: "named",
        name: "Bool",
      });
    } else if (typeof val === "string") {
      return wrapNull({
        type: "named",
        name: "String",
      });
    } else if (typeof val === "number") {
      if (Number.isInteger(val)) {
        return wrapNull({
          type: "named",
          name: "Int",
        });
      } else {
        return wrapNull({
          type: "named",
          name: "Float",
        });
      }
    } else if (typeof val === "object") {
      // const fDict: any = {};
      // for (const [k, v] of Object.entries(val)) {
      //   const nestedName = namePrefix + "_" + k;
      //   const fieldType = recursiveType(v, nestedName, objTypes);
      //   fDict[k] = {
      //     description: null,
      //     type: fieldType,
      //   };
      // }
      // objTypes[namePrefix] = {
      //   description: null,
      //   fields: fDict,
      // };
      // return {
      //   type: "named",
      //   name: namePrefix,
      // };
      return {
        type: "named",
        name: "JSON"
      }
    } else {
      throw new Error(`Not Implemented: ${typeof val}`);
    }
};

export const insertion = (
    collectionName: string,
    payloadDict: Record<string, any>,
    objTypes: { [k: string]: ObjectType }
  ): Record<string, ObjectField> => {
    let responseDict: Record<string, ObjectField> = {};
    for (const [k, v] of Object.entries(payloadDict)) {
      if (RESTRICTED_NAMES.includes(k)) {
        throw new Error(`${k} is a restricted name!`);
      }
      responseDict[k] = {
        description: null,
        type: recursiveType(v, collectionName + "_" + k, objTypes),
      };
    }
    return responseDict;
};