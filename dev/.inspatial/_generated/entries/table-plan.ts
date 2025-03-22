import { EntryBase } from "#orm/types";
export interface TablePlan extends EntryBase {
  _name: "tablePlan";
  /**
   * **Table Plan** (IDField)
   * @type {string}
   * @required true
   */
  id: string;
  /**
   * **Created At** (TimeStampField)
   * @description The date and time this entry was created
   * @type {number}
   * @required true
   */
  createdAt: number;
  /**
   * **Updated At** (TimeStampField)
   * @description The date and time this entry was last updated
   * @type {number}
   * @required true
   */
  updatedAt: number;
  /**
   * **Table Name** (DataField)
   * @description The name of the table
   * @type {string}
   * @required true
   */
  tableName: string;
  /**
   * **Capacity** (IntField)
   * @type {number}
   * @required true
   */
  capacity: number;
}
