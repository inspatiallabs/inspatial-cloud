import type { EntryBase } from "@inspatial/cloud/types";

export interface InTaskGlobal extends EntryBase {
  _name: "inTaskGlobal";
  /**
   * **Task Type** (ChoicesField)
   * @type {'entry' | 'settings' | 'app'}
   * @required true
   */
  taskType: "entry" | "settings" | "app";
  /**
   * **Entry/Settings Name** (DataField)
   * @type {string}
   */
  typeKey?: string;
  /**
   * **Entry ID** (DataField)
   * @description The ID of the entry to run the action on
   * @type {string}
   */
  entryId?: string;
  /**
   * **Group** (DataField)
   * @type {string}
   */
  group?: string;
  /**
   * **Action Name** (DataField)
   * @type {string}
   * @required true
   */
  actionName: string;
  /**
   * **Status** (ChoicesField)
   * @type {'queued' | 'running' | 'cancelled' | 'completed' | 'failed'}
   * @required true
   */
  status: "queued" | "running" | "cancelled" | "completed" | "failed";
  /**
   * **Start Time** (TimeStampField)
   * @type {number}
   */
  startTime?: number;
  /**
   * **End Time** (TimeStampField)
   * @type {number}
   */
  endTime?: number;
  /**
   * **Task Data** (JSONField)
   * @type {Record<string, any>}
   */
  taskData?: Record<string, any>;
  /**
   * **Result Data** (JSONField)
   * @type {Record<string, any>}
   */
  resultData?: Record<string, any>;
  /**
   * **InTask Global** (IDField)
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
}
