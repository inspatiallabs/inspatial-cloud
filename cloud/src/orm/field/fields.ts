import textField from "#/orm/field/fields/text-field.ts";
import bigIntField from "#/orm/field/fields/big-int-field.ts";
import booleanField from "#/orm/field/fields/boolean-field.ts";
import choicesField from "#/orm/field/fields/choices-field.ts";
import connectionField from "#/orm/field/fields/connection-field.ts";
import currencyField from "#/orm/field/fields/currency-field.ts";
import dateField from "#/orm/field/fields/date-field.ts";
import { dataField } from "#/orm/field/fields/data-field.ts";
import decimalField from "#/orm/field/fields/decimal-field.ts";
import emailField from "#/orm/field/fields/email-field.ts";
import imageField from "#/orm/field/fields/image-field.ts";
import intField from "#/orm/field/fields/int-field.ts";
import jsonField from "#/orm/field/fields/json-field.ts";
import listField from "#/orm/field/fields/list-field.ts";
import multiChoiceField from "#/orm/field/fields/multi-choice-field.ts";
import passwordField from "#/orm/field/fields/password-field.ts";
import phoneField from "#/orm/field/fields/phone-field.ts";
import richTextField from "#/orm/field/fields/rich-text-field.ts";
import timestampField from "#/orm/field/fields/timestamp-field.ts";
import urlField from "#/orm/field/fields/url-field.ts";
import idField from "#/orm/field/fields/id-field.ts";
import fileField from "#/orm/field/fields/file-field.ts";

export const ormFields = [
  bigIntField,
  booleanField,
  choicesField,
  connectionField,
  currencyField,
  dataField,
  dateField,
  decimalField,
  emailField,
  imageField,
  intField,
  jsonField,
  listField,
  multiChoiceField,
  passwordField,
  phoneField,
  richTextField,
  textField,
  timestampField,
  urlField,
  idField,
  fileField,
];
