/**
 * Module Planner — Intent Compiler Layer 5
 */

import { DomainModel } from "./DomainModelGenerator";
import { Architecture } from "./ArchitectureSynthesizer";

export interface ModulePlan {
  modules: string[];
  dependencies: Record<string, string[]>;
}

export class ModulePlanner {
  plan(domainModel: DomainModel, architecture: Architecture): ModulePlan {
    const modules: string[] = [];
    const dependencies: Record<string, string[]> = {};

    // 根据实体生成模块
    for (const entity of domainModel.entities) {
      const moduleName = `${entity.name}Module`;
      modules.push(moduleName);
      dependencies[moduleName] = entity.relationships.map(r => `${r}Module`);
    }

    // 添加基础模块
    modules.push("AuthModule", "DatabaseModule", "APIModule");
    dependencies["AuthModule"] = ["DatabaseModule"];
    dependencies["APIModule"] = ["AuthModule"];

    return { modules, dependencies };
  }
}
