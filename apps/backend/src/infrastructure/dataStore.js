import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { createSeedData } from "./seedData.js";
import { notFound } from "../domain/errors.js";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class DataStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = null;
  }

  init() {
    mkdirSync(dirname(this.filePath), { recursive: true });
    if (!existsSync(this.filePath)) {
      this.data = createSeedData();
      this.save();
      return;
    }
    this.data = JSON.parse(readFileSync(this.filePath, "utf8"));
  }

  save() {
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  all(collection) {
    return clone(this.data[collection] || []);
  }

  findById(collection, id) {
    const entity = (this.data[collection] || []).find((item) => item.id === id);
    return entity ? clone(entity) : null;
  }

  findOne(collection, predicate) {
    const entity = (this.data[collection] || []).find(predicate);
    return entity ? clone(entity) : null;
  }

  query(collection, predicate) {
    return clone((this.data[collection] || []).filter(predicate));
  }

  create(collection, entity) {
    const now = new Date().toISOString();
    const record = {
      id: entity.id || randomUUID(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      ...entity
    };
    if (!this.data[collection]) this.data[collection] = [];
    this.data[collection].push(record);
    this.save();
    return clone(record);
  }

  update(collection, id, patch) {
    const items = this.data[collection] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw notFound(`${collection} record not found`);
    items[index] = {
      ...items[index],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    this.save();
    return clone(items[index]);
  }

  delete(collection, id) {
    const items = this.data[collection] || [];
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) throw notFound(`${collection} record not found`);
    const [deleted] = items.splice(index, 1);
    this.save();
    return clone(deleted);
  }

  audit(actorId, action, entityType, entityId, metadata = {}) {
    return this.create("auditLogs", {
      actorId,
      action,
      entityType,
      entityId,
      metadata
    });
  }
}
