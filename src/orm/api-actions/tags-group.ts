import { CloudAPIGroup } from "@inspatial/cloud";
import { raiseCloudException } from "../../serve/exeption/cloud-exception.ts";
import type { EntryName } from "#types/models.ts";

export const tagsGroup = new CloudAPIGroup("tags", {
  description: "Actions related to tags",
  label: "Tags",
});

tagsGroup.addAction("getAll", {
  description: "Retrieve all tags",
  params: [],
  label: "Get Tags",
  async run({ orm }) {
    return await orm.getTags();
  },
});

// tagsGroup.addAction("create", {});

// tagsGroup.addAction("rename", {});

tagsGroup.addAction("tagEntry", {
  params: [{
    key: "entryType",
    type: "DataField",
    required: true,
  }, {
    key: "entryId",
    type: "DataField",
    required: true,
  }, {
    key: "tagId",
    type: "IntField",
  }, {
    key: "tagName",
    type: "DataField",
  }],
  async run({ orm, params: { entryType, entryId, tagId, tagName } }) {
    const entry = await orm.getEntry(entryType as EntryName, entryId);
    if (tagId) {
      await entry.addTag(tagId);
      return entry.tags;
    }
    if (tagName) {
      tagName = tagName.trim().toLowerCase();
      await entry.addTagByName(tagName);
      return entry.tags;
    }
    raiseCloudException("Either tagId or tagName must be provided");
  },
});

tagsGroup.addAction("untagEntry", {
  description: "Remove a tag from an entry",
  params: [{
    key: "entryType",
    type: "DataField",
    required: true,
  }, {
    key: "entryId",
    type: "DataField",
    required: true,
  }, {
    key: "tagId",
    type: "IntField",
    required: true,
  }],
  async run({ orm, params: { entryType, entryId, tagId } }) {
    const entry = await orm.getEntry(entryType as EntryName, entryId);
    await entry.removeTag(tagId);
    return entry.tags;
  },
});
