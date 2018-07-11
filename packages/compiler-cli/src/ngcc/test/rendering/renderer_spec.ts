/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';
import MagicString from 'magic-string';
import {makeProgram} from '../helpers/utils';
import {AnalyzedClass, Analyzer} from '../../src/analyzer';
import {Esm2015ReflectionHost} from '../../src/host/esm2015_host';
import {Esm2015FileParser} from '../../src/parsing/esm2015_parser';
import {Renderer} from '../../src/rendering/renderer';

class TestRenderer extends Renderer {
  addImports(output: MagicString, imports: { name: string, as: string }[]) {
    output.append('\nADD IMPORTS');
  }
  addDefinitions(output: MagicString, analyzedClass: AnalyzedClass, definitions: string) {
    output.append('\nADD DEFINITIONS');
  }
  removeDecorators(output: MagicString, decoratorsToRemove: Map<ts.Node, ts.Node[]>) {
    output.append('\nREMOVE DECORATORS');
  }
}

function createTestRenderer() {
  const renderer = new TestRenderer();
  spyOn(renderer, 'addImports').and.callThrough();
  spyOn(renderer, 'addDefinitions').and.callThrough();
  spyOn(renderer, 'removeDecorators').and.callThrough();
  return renderer as jasmine.SpyObj<TestRenderer>;
}

function analyze(file: {name: string, contents: string}) {
  const program = makeProgram(file);
  const host = new Esm2015ReflectionHost(program.getTypeChecker());
  const parser = new Esm2015FileParser(program, host);
  const analyzer = new Analyzer(program.getTypeChecker(), host);

  const parsedFiles = parser.parseFile(program.getSourceFile(file.name)!);
  return parsedFiles.map(file => analyzer.analyzeFile(file));
}

describe('Renderer', () => {
  const PROGRAM = {
    name: 'some/file.js',
    contents: `
      import {Directive} from '@angular/core';
      export class A {}
      A.decorators = [
        { type: Directive, args: [{ selector: '[a]' }] }
      ];
    `
  };

  const CONVERTED_CONTENTS = PROGRAM.contents + `\nADD DEFINITIONS\nADD IMPORTS\nREMOVE DECORATORS`;

  describe('renderFile()', () => {
    it('should return a `RenderResult` that contains the modified.', () => {
      const renderer = createTestRenderer();
      const analyzedFiles = analyze(PROGRAM);
      const result = renderer.renderFile(analyzedFiles[0], 'some/output/path.js');
      expect(result.source.path).toEqual('some/output/path.js');
      expect(result.source.contents).toEqual(CONVERTED_CONTENTS + `\n//# sourceMappingURL=some/output/path.js.map`);
      expect(result.map.path).toEqual('some/output/path.js.map');
      expect(result.map.contents).toEqual('{"version":3,"file":"path.js.map","sources":["../..//some/file.js"],"sourcesContent":[null],"names":[],"mappings":"AAAA;;;;;;"}');
    });

    it('should call addImports with the source code and info about the core Angular library.', () => {
      const renderer = createTestRenderer();
      const analyzedFiles = analyze(PROGRAM);
      renderer.renderFile(analyzedFiles[0], 'some/output/path.js');
      expect(renderer.addImports.calls.first().args[0].toString()).toEqual(CONVERTED_CONTENTS);
      expect(renderer.addImports.calls.first().args[1]).toEqual([{name: '@angular/core', as: 'ɵ0' }]);
    });

    it('should call addDefinitions with the source code, the analyzed class and the renderered definitions.', () => {
      const renderer = createTestRenderer();
      const analyzedFile = analyze(PROGRAM)[0];
      renderer.renderFile(analyzedFile, 'some/output/path.js');
      expect(renderer.addDefinitions.calls.first().args[0].toString()).toEqual(CONVERTED_CONTENTS);
      expect(renderer.addDefinitions.calls.first().args[1]).toBe(analyzedFile.analyzedClasses[0]);
      expect(renderer.addDefinitions.calls.first().args[2])
        .toEqual(`A.ngDirectiveDef = ɵ0.ɵdefineDirective({ type: A, selectors: [["", "a", ""]], factory: function A_Factory() { return new A(); } });`);
    });

    it('should call removeDecorators with the source code, a map of class decorators that have been analyzed', () => {
      const renderer = createTestRenderer();
      const analyzedFile = analyze(PROGRAM)[0];
      renderer.renderFile(analyzedFile, 'some/output/path.js');
      expect(renderer.removeDecorators.calls.first().args[0].toString()).toEqual(CONVERTED_CONTENTS);

      // Each map key is the TS node of the decorator container
      // Each map value is an array of TS nodes that are the decorators to remove
      const map = renderer.removeDecorators.calls.first().args[1] as Map<ts.Node, ts.Node[]>;
      const keys = Array.from(map.keys());
      expect(keys.length).toEqual(1);
      expect(keys[0].getText()).toEqual(`[
        { type: Directive, args: [{ selector: '[a]' }] }
      ]`);
      const values = Array.from(map.values());
      expect(values.length).toEqual(1);
      expect(values[0].length).toEqual(1);
      expect(values[0][0].getText()).toEqual(`{ type: Directive, args: [{ selector: '[a]' }] }`);
    });
  });
});