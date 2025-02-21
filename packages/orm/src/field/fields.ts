import textField from "#/field/fields/text-field.ts";
import bigIntField from "#/field/fields/big-int-field.ts";
import booleanField from "#/field/fields/boolean-field.ts";
import choicesField from "#/field/fields/choices-field.ts";
import connectionField from "#/field/fields/connection-field.ts";
import currencyField from "#/field/fields/currency-field.ts";
import dateField from "#/field/fields/date-field.ts";
import { dataField } from "#/field/fields/data-field.ts";
import decimalField from "#/field/fields/decimal-field.ts";
import emailField from "#/field/fields/email-field.ts";
import imageField from "#/field/fields/image-field.ts";
import intField from "#/field/fields/int-field.ts";
import jsonField from "#/field/fields/json-field.ts";
import listField from "#/field/fields/list-field.ts";
import multiChoiceField from "#/field/fields/multi-choice-field.ts";
import passwordField from "#/field/fields/password-field.ts";
import phoneField from "#/field/fields/phone-field.ts";
import richTextField from "#/field/fields/rich-text-field.ts";
import timestampField from "#/field/fields/timestamp-field.ts";
import urlField from "#/field/fields/url-field.ts";
import idField from "#/field/fields/id-field.ts";

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
];
