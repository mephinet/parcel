// @flow strict-local
import type {
  Config as IConfig,
  ConfigResult,
  FileCreateInvalidation,
  FilePath,
  PackageJSON,
  ConfigResultWithFilePath,
  DevDepOptions,
} from '@parcel/types';
import type {Config, ParcelOptions} from '../types';

import {
  DefaultWeakMap,
  fromProjectPath,
  loadConfig,
  toProjectPath,
} from '@parcel/utils';
import Environment from './Environment';
import invariant from 'assert';

const internalConfigToConfig: DefaultWeakMap<
  ParcelOptions,
  WeakMap<Config, PublicConfig>,
> = new DefaultWeakMap(() => new WeakMap());

export default class PublicConfig implements IConfig {
  #config /*: Config */;
  #pkg /*: ?PackageJSON */;
  #pkgFilePath /*: ?FilePath */;
  #options /*: ParcelOptions */;

  constructor(config: Config, options: ParcelOptions): PublicConfig {
    let existing = internalConfigToConfig.get(options).get(config);
    if (existing != null) {
      return existing;
    }

    this.#config = config;
    this.#options = options;
    internalConfigToConfig.get(options).set(config, this);
    return this;
  }

  get env(): Environment {
    return new Environment(this.#config.env);
  }

  get searchPath(): FilePath {
    return fromProjectPath(this.#options.projectRoot, this.#config.searchPath);
  }

  get result(): ConfigResult {
    return this.#config.result;
  }

  get isSource(): boolean {
    return this.#config.isSource;
  }

  get includedFiles(): Set<FilePath> {
    return new Set(
      [...this.#config.includedFiles].map(f =>
        fromProjectPath(this.#options.projectRoot, f),
      ),
    );
  }

  // $FlowFixMe
  setResult(result: any): void {
    this.#config.result = result;
  }

  setResultHash(resultHash: string) {
    this.#config.resultHash = resultHash;
  }

  addIncludedFile(filePath: FilePath) {
    this.#config.includedFiles.add(
      toProjectPath(this.#options.projectRoot, filePath),
    );
  }

  addDevDependency(devDep: DevDepOptions) {
    this.#config.devDeps.push({
      ...devDep,
      resolveFrom: toProjectPath(this.#options.projectRoot, devDep.resolveFrom),
    });
  }

  invalidateOnFileCreate(invalidation: FileCreateInvalidation) {
    if (invalidation.glob != null) {
      // $FlowFixMe
      this.#config.invalidateOnFileCreate.push(invalidation);
    } else if (invalidation.filePath != null) {
      this.#config.invalidateOnFileCreate.push({
        filePath: toProjectPath(
          this.#options.projectRoot,
          invalidation.filePath,
        ),
      });
    } else {
      invariant(invalidation.aboveFilePath != null);
      this.#config.invalidateOnFileCreate.push({
        // $FlowFixMe
        fileName: invalidation.fileName,
        aboveFilePath: toProjectPath(
          this.#options.projectRoot,
          invalidation.aboveFilePath,
        ),
      });
    }
  }

  shouldInvalidateOnStartup() {
    this.#config.shouldInvalidateOnStartup = true;
  }

  async getConfigFrom(
    searchPath: FilePath,
    fileNames: Array<string>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
      exclude?: boolean,
    |},
  ): Promise<ConfigResultWithFilePath | null> {
    let packageKey = options && options.packageKey;
    if (packageKey != null) {
      let pkg = await this.getPackage();
      if (pkg && pkg[packageKey]) {
        return {
          contents: pkg[packageKey],
          // This should be fine as pkgFilePath should be defined by getPackage()
          filePath: this.#pkgFilePath || '',
        };
      }
    }

    if (fileNames.length === 0) {
      return null;
    }

    // Invalidate when any of the file names are created above the search path.
    for (let fileName of fileNames) {
      this.invalidateOnFileCreate({
        fileName,
        aboveFilePath: searchPath,
      });
    }

    let parse = options && options.parse;
    let conf = await loadConfig(
      this.#options.inputFS,
      searchPath,
      fileNames,
      parse == null ? null : {parse},
    );
    if (conf == null) {
      return null;
    }

    let configFilePath = conf.files[0].filePath;
    if (!options || !options.exclude) {
      this.addIncludedFile(configFilePath);
    }

    return {
      contents: conf.config,
      filePath: configFilePath,
    };
  }

  getConfig(
    filePaths: Array<FilePath>,
    options: ?{|
      packageKey?: string,
      parse?: boolean,
      exclude?: boolean,
    |},
  ): Promise<ConfigResultWithFilePath | null> {
    return this.getConfigFrom(this.searchPath, filePaths, options);
  }

  async getPackage(): Promise<PackageJSON | null> {
    if (this.#pkg) {
      return this.#pkg;
    }

    let pkgConfig = await this.getConfig(['package.json']);
    if (!pkgConfig) {
      return null;
    }

    this.#pkg = pkgConfig.contents;
    this.#pkgFilePath = pkgConfig.filePath;

    return this.#pkg;
  }
}
