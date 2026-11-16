import { I18n, MessageDescriptor } from '@lingui/core';

class I18nMap<T> {
  private map: Map<T, MessageDescriptor>;
  constructor(values: [T, MessageDescriptor][]) {
    this.map = new Map();
    values.forEach(([key, value]) => {
      this.map.set(key, value);
    });
  }

  public get(i18n: I18n, key: T) {
    return this.map.has(key) ? i18n._(this.map.get(key)!) : key;
  }

  public getOrBlank(i18n: I18n, key: T) {
    return this.map.has(key) ? i18n._(this.map.get(key)!) : '';
  }
}

export function defineI18nMap<T>(values: [T, MessageDescriptor][]): I18nMap<T> {
  return new I18nMap(values);
}
