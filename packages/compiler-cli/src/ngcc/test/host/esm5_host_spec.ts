/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import {ClassMemberKind, Import} from '../../../ngtsc/host';
import {Esm5ReflectionHost} from '../../src/host/esm5_host';
import {getDeclaration, makeProgram} from '../helpers/utils';

const SOME_DIRECTIVE_FILE = {
  name: '/some_directive.js',
  contents: `
    import { Directive, Inject, InjectionToken, Input } from '@angular/core';

    var INJECTED_TOKEN = new InjectionToken('injected');
    var ViewContainerRef = {};
    var TemplateRef = {};

    var SomeDirective = (function() {
      function SomeDirective(_viewContainer, _template, injected) {}
      SomeDirective.decorators = [
        { type: Directive, args: [{ selector: '[someDirective]' },] }
      ];
      SomeDirective.ctorParameters = function() { return [
        { type: ViewContainerRef, },
        { type: TemplateRef, },
        { type: undefined, decorators: [{ type: Inject, args: [INJECTED_TOKEN,] },] },
      ]; };
      SomeDirective.propDecorators = {
        "input1": [{ type: Input },],
        "input2": [{ type: Input },],
      };
      return SomeDirective;
    }());
  `,
};

const SIMPLE_CLASS_FILE = {
  name: '/simple_class.js',
  contents: `
    var SimpleClass = (function() {
      function SimpleClass() {}
      return SimpleClass;
    }());
  `,
};

const FOO_FUNCTION_FILE = {
  name: '/foo_function.js',
  contents: `
    import { Directive } from '@angular/core';

    function foo() {}
    foo.decorators = [
      { type: Directive, args: [{ selector: '[ignored]' },] }
    ];
  `,
};

const INVALID_DECORATORS_FILE = {
  name: '/invalid_decorators.js',
  contents: `
    var NotArrayLiteralDecorator = {};
    var NotArrayLiteral = (function() {
      function NotArrayLiteral() {
      }
      NotArrayLiteral.decorators = () => [
        { type: NotArrayLiteralDecorator, args: [{ selector: '[ignored]' },] },
      ];
      return NotArrayLiteral;
    }());

    var NotObjectLiteralDecorator = {};
    var NotObjectLiteral = (function() {
      function NotObjectLiteral() {
      }
      NotObjectLiteral.decorators = [
        "This is not an object literal",
        { type: NotObjectLiteralDecorator },
      ];
      return NotObjectLiteral;
    }());

    var NoTypePropertyDecorator1 = {};
    var NoTypePropertyDecorator2 = {};
    var NoTypeProperty = (function() {
      function NoTypeProperty() {
      }
      NoTypeProperty.decorators = [
        { notType: NoTypePropertyDecorator1 },
        { type: NoTypePropertyDecorator2 },
      ];
      return NoTypeProperty;
    }());

    var NotIdentifierDecorator = {};
    var NotIdentifier = (function() {
      function NotIdentifier() {
      }
      NotIdentifier.decorators = [
        { type: 'StringsLiteralsAreNotIdentifiers' },
        { type: NotIdentifierDecorator },
      ];
      return NotIdentifier;
    }());
  `,
};

const INVALID_DECORATOR_ARGS_FILE = {
  name: '/invalid_decorator_args.js',
  contents: `
    var NoArgsPropertyDecorator = {};
    var NoArgsProperty = (function() {
      function NoArgsProperty() {
      }
      NoArgsProperty.decorators = [
        { type: NoArgsPropertyDecorator },
      ];
      return NoArgsProperty;
    }());

    var NoPropertyAssignmentDecorator = {};
    var args = [{ selector: '[ignored]' },];
    var NoPropertyAssignment = (function() {
      function NoPropertyAssignment() {
      }
      NoPropertyAssignment.decorators = [
        { type: NoPropertyAssignmentDecorator, args },
      ];
      return NoPropertyAssignment;
    }());

    var NotArrayLiteralDecorator = {};
    var NotArrayLiteral = (function() {
      function NotArrayLiteral() {
      }
      NotArrayLiteral.decorators = [
        { type: NotArrayLiteralDecorator, args: () => [{ selector: '[ignored]' },] },
      ];
      return NotArrayLiteral;
    }());
    `,
};

const INVALID_PROP_DECORATORS_FILE = {
  name: '/invalid_prop_decorators.js',
  contents: `
    var NotObjectLiteralDecorator = {};
    var NotObjectLiteral = (function() {
      function NotObjectLiteral() {
      }
      NotObjectLiteral.propDecorators = () => ({
        "prop": [{ type: NotObjectLiteralDecorator },]
      });
      return NotObjectLiteral;
    }());

    var NotObjectLiteralPropDecorator = {};
    var NotObjectLiteralProp = (function() {
      function NotObjectLiteralProp() {
      }
      NotObjectLiteralProp.propDecorators = {
        "prop": [
          "This is not an object literal",
          { type: NotObjectLiteralPropDecorator },
        ]
      };
      return NotObjectLiteralProp;
    }());

    var NoTypePropertyDecorator1 = {};
    var NoTypePropertyDecorator2 = {};
    var NoTypeProperty = (function() {
      function NoTypeProperty() {
      }
      NoTypeProperty.propDecorators = {
        "prop": [
          { notType: NoTypePropertyDecorator1 },
          { type: NoTypePropertyDecorator2 },
        ]
      };
      return NoTypeProperty;
    }());

    var NotIdentifierDecorator = {};
    var NotIdentifier = (function() {
      function NotIdentifier() {
      }
      NotIdentifier.propDecorators = {
        "prop": [
          { type: 'StringsLiteralsAreNotIdentifiers' },
          { type: NotIdentifierDecorator },
        ]
      };
      return NotIdentifier;
    }());
    `,
};

const INVALID_PROP_DECORATOR_ARGS_FILE = {
  name: '/invalid_prop_decorator_args.js',
  contents: `
    var NoArgsPropertyDecorator = {};
    var NoArgsProperty = (function() {
      function NoArgsProperty() {
      }
      NoArgsProperty.propDecorators = {
        "prop": [{ type: NoArgsPropertyDecorator },]
      };
      return NoArgsProperty;
    }());

    var NoPropertyAssignmentDecorator = {};
    var args = [{ selector: '[ignored]' },];
    var NoPropertyAssignment = (function() {
      function NoPropertyAssignment() {
      }
      NoPropertyAssignment.propDecorators = {
        "prop": [{ type: NoPropertyAssignmentDecorator, args },]
      };
      return NoPropertyAssignment;
    }());

    var NotArrayLiteralDecorator = {};
    var NotArrayLiteral = (function() {
      function NotArrayLiteral() {
      }
      NotArrayLiteral.propDecorators = {
        "prop": [{ type: NotArrayLiteralDecorator, args: () => [{ selector: '[ignored]' },] },],
      };
      return NotArrayLiteral;
    }());
    `,
};

const INVALID_CTOR_DECORATORS_FILE = {
  name: '/invalid_ctor_decorators.js',
  contents: `
    var NoParametersDecorator = {};
    var NoParameters = (function() {
      function NoParameters() {}
      return NoParameters;
    }());

    var ArrowFunctionDecorator = {};
    var ArrowFunction = (function() {
      function ArrowFunction(arg1) {
      }
      ArrowFunction.ctorParameters = () => [
        { type: 'ParamType', decorators: [{ type: ArrowFunctionDecorator },] }
      ];
      return ArrowFunction;
    }());

    var NotArrayLiteralDecorator = {};
    var NotArrayLiteral = (function() {
      function NotArrayLiteral(arg1) {
      }
      NotArrayLiteral.ctorParameters = function() { return 'StringsAreNotArrayLiterals'; };
      return NotArrayLiteral;
    }());

    var NotObjectLiteralDecorator = {};
    var NotObjectLiteral = (function() {
      function NotObjectLiteral(arg1, arg2) {
      }
      NotObjectLiteral.ctorParameters = function() { return [
        "This is not an object literal",
        { type: 'ParamType', decorators: [{ type: NotObjectLiteralDecorator },] },
      ]; };
      return NotObjectLiteral;
    }());

    var NoTypePropertyDecorator1 = {};
    var NoTypePropertyDecorator2 = {};
    var NoTypeProperty = (function() {
      function NoTypeProperty(arg1, arg2) {
      }
      NoTypeProperty.ctorParameters = function() { return [
        {
          type: 'ParamType',
          decorators: [
            { notType: NoTypePropertyDecorator1 },
            { type: NoTypePropertyDecorator2 },
          ]
        },
      ]; };
      return NoTypeProperty;
    }());

    var NotIdentifierDecorator = {};
    var NotIdentifier = (function() {
      function NotIdentifier(arg1, arg2) {
      }
      NotIdentifier.ctorParameters = function() { return [
        {
          type: 'ParamType',
          decorators: [
            { type: 'StringsLiteralsAreNotIdentifiers' },
            { type: NotIdentifierDecorator },
          ]
        },
      ]; };
      return NotIdentifier;
    }());
    `,
};

const INVALID_CTOR_DECORATOR_ARGS_FILE = {
  name: '/invalid_ctor_decorator_args.js',
  contents: `
    var NoArgsPropertyDecorator = {};
    var NoArgsProperty = (function() {
      function NoArgsProperty(arg1) {
      }
      NoArgsProperty.ctorParameters = function() { return [
        { type: 'ParamType', decorators: [{ type: NoArgsPropertyDecorator },] },
      ]; };
      return NoArgsProperty;
    }());

    var NoPropertyAssignmentDecorator = {};
    var args = [{ selector: '[ignored]' },];
    var NoPropertyAssignment = (function() {
      function NoPropertyAssignment(arg1) {
      }
      NoPropertyAssignment.ctorParameters = function() { return [
        { type: 'ParamType', decorators: [{ type: NoPropertyAssignmentDecorator, args },] },
      ]; };
      return NoPropertyAssignment;
    }());

    var NotArrayLiteralDecorator = {};
    var NotArrayLiteral = (function() {
      function NotArrayLiteral(arg1) {
      }
      NotArrayLiteral.ctorParameters = function() { return [
        { type: 'ParamType', decorators: [{ type: NotArrayLiteralDecorator, args: () => [{ selector: '[ignored]' },] },] },
      ]; };
      return NotArrayLiteral;
    }());
    `,
};

const IMPORTS_FILES = [
  {
    name: '/a.js',
    contents: `
      export const a = 'a';
    `,
  },
  {
    name: '/b.js',
    contents: `
      import {a} from './a.js';
      import {a as foo} from './a.js';

      var b = a;
      var c = foo;
      var d = b;
    `,
  },
];

describe('Esm5ReflectionHost', () => {

  describe('getDecoratorsOfDeclaration()', () => {
    it('should find the decorators on a class', () => {
      const program = makeProgram(SOME_DIRECTIVE_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SOME_DIRECTIVE_FILE.name, 'SomeDirective', ts.isVariableDeclaration);
      debugger;
      const decorators = host.getDecoratorsOfDeclaration(classNode)!;

      expect(decorators).toBeDefined();
      expect(decorators.length).toEqual(1);

      const decorator = decorators[0];
      expect(decorator.name).toEqual('Directive');
      expect(decorator.import).toEqual({name: 'Directive', from: '@angular/core'});
      expect(decorator.args!.map(arg => arg.getText())).toEqual([
        '{ selector: \'[someDirective]\' }',
      ]);
    });

    it('should return null if the symbol is not a class', () => {
      const program = makeProgram(FOO_FUNCTION_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const functionNode = getDeclaration(program, FOO_FUNCTION_FILE.name, 'foo', ts.isFunctionDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(functionNode);
      expect(decorators).toBe(null);
    });

    it('should return null if there are no decorators', () => {
      const program = makeProgram(SIMPLE_CLASS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SIMPLE_CLASS_FILE.name, 'SimpleClass', ts.isVariableDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(classNode);
      expect(decorators).toBe(null);
    });

    it('should ignore `decorators` if it is not an array literal', () => {
      const program = makeProgram(INVALID_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_DECORATORS_FILE.name, 'NotArrayLiteral', ts.isVariableDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(classNode);
      expect(decorators).toEqual([]);
    });

    it('should ignore decorator elements that are not object literals', () => {
      const program = makeProgram(INVALID_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_DECORATORS_FILE.name, 'NotObjectLiteral', ts.isVariableDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(classNode)!;

      expect(decorators.length).toBe(1);
      expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NotObjectLiteralDecorator'}));
    });

    it('should ignore decorator elements that have no `type` property', () => {
      const program = makeProgram(INVALID_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_DECORATORS_FILE.name, 'NoTypeProperty', ts.isVariableDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(classNode)!;

      expect(decorators.length).toBe(1);
      expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NoTypePropertyDecorator2'}));
    });

    it('should ignore decorator elements whose `type` value is not an identifier', () => {
      const program = makeProgram(INVALID_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_DECORATORS_FILE.name, 'NotIdentifier', ts.isVariableDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(classNode)!;

      expect(decorators.length).toBe(1);
      expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NotIdentifierDecorator'}));
    });

    it('should use `getImportOfIdentifier()` to retrieve import info', () => {
      const mockImportInfo = {} as Import;
      const spy = spyOn(Esm5ReflectionHost.prototype, 'getImportOfIdentifier').and.returnValue(mockImportInfo);

      const program = makeProgram(SOME_DIRECTIVE_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SOME_DIRECTIVE_FILE.name, 'SomeDirective', ts.isVariableDeclaration);
      const decorators = host.getDecoratorsOfDeclaration(classNode)!;

      expect(decorators.length).toEqual(1);
      expect(decorators[0].import).toBe(mockImportInfo);

      const typeIdentifier = spy.calls.mostRecent().args[0] as ts.Identifier;
      expect(typeIdentifier.text).toBe('Directive');
    });

    describe('(returned decorators `args`)', () => {
      it('should be an empty array if decorator has no `args` property', () => {
        const program = makeProgram(INVALID_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_DECORATOR_ARGS_FILE.name, 'NoArgsProperty', ts.isVariableDeclaration);
        const decorators = host.getDecoratorsOfDeclaration(classNode)!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NoArgsPropertyDecorator');
        expect(decorators[0].args).toEqual([]);
      });

      it('should be an empty array if decorator\'s `args` has no property assignment', () => {
        const program = makeProgram(INVALID_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_DECORATOR_ARGS_FILE.name, 'NoPropertyAssignment', ts.isVariableDeclaration);
        const decorators = host.getDecoratorsOfDeclaration(classNode)!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NoPropertyAssignmentDecorator');
        expect(decorators[0].args).toEqual([]);
      });

      it('should be an empty array if `args` property value is not an array literal', () => {
        const program = makeProgram(INVALID_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_DECORATOR_ARGS_FILE.name, 'NotArrayLiteral', ts.isVariableDeclaration);
        const decorators = host.getDecoratorsOfDeclaration(classNode)!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NotArrayLiteralDecorator');
        expect(decorators[0].args).toEqual([]);
      });
    });
  });

  describe('getMembersOfClass()', () => {
    it('should find decorated members on a class', () => {
      const program = makeProgram(SOME_DIRECTIVE_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SOME_DIRECTIVE_FILE.name, 'SomeDirective', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);

      expect(members).toBeDefined();
      expect(members.length).toEqual(2);
      expect(members.map(member => member.name)).toEqual(['input1', 'input2']);
      expect(members.map(member => member.kind)).toEqual([ClassMemberKind.Property, ClassMemberKind.Property]);
      expect(members.map(member => member.isStatic)).toEqual([false, false]);
    });

    it('should return an empty array if the symbol is not a class', () => {
      const program = makeProgram(FOO_FUNCTION_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const functionNode = getDeclaration(program, FOO_FUNCTION_FILE.name, 'foo', ts.isFunctionDeclaration);
      const members = host.getMembersOfClass(functionNode);

      expect(members).toEqual([]);
    });

    it('should return an empty array if there are no prop decorators', () => {
      const program = makeProgram(SIMPLE_CLASS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SIMPLE_CLASS_FILE.name, 'SimpleClass', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);

      expect(members).toEqual([]);
    });

    it('should ignore `propDecorators` if it is not an object literal', () => {
      const program = makeProgram(INVALID_PROP_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_PROP_DECORATORS_FILE.name, 'NotObjectLiteral', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);

      expect(members).toEqual([]);
    });

    it('should ignore prop decorator elements that are not object literals', () => {
      const program = makeProgram(INVALID_PROP_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_PROP_DECORATORS_FILE.name, 'NotObjectLiteralProp', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);
      const decorators = members[0].decorators!;

      expect(decorators.length).toBe(1);
      expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NotObjectLiteralPropDecorator'}));
    });

    it('should ignore prop decorator elements that have no `type` property', () => {
      const program = makeProgram(INVALID_PROP_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_PROP_DECORATORS_FILE.name, 'NoTypeProperty', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);
      const decorators = members[0].decorators!;

      expect(decorators.length).toBe(1);
      expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NoTypePropertyDecorator2'}));
    });

    it('should ignore prop decorator elements whose `type` value is not an identifier', () => {
      const program = makeProgram(INVALID_PROP_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_PROP_DECORATORS_FILE.name, 'NotIdentifier', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);
      const decorators = members[0].decorators!;

      expect(decorators.length).toBe(1);
      expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NotIdentifierDecorator'}));
    });

    it('should use `getImportOfIdentifier()` to retrieve import info', () => {
      const mockImportInfos = [{}, {}] as Import[];
      const spy = spyOn(Esm5ReflectionHost.prototype, 'getImportOfIdentifier').and.returnValues(...mockImportInfos);

      const program = makeProgram(SOME_DIRECTIVE_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SOME_DIRECTIVE_FILE.name, 'SomeDirective', ts.isVariableDeclaration);
      const members = host.getMembersOfClass(classNode);

      expect(members.length).toBe(2);
      members.forEach((member, i) => {
        expect(member.decorators!.length).toBe(1);
        expect(member.decorators![0].import).toBe(mockImportInfos[i]);
      });

      expect(spy).toHaveBeenCalledTimes(2);
      spy.calls.allArgs().forEach(args => expect(args[0].text).toBe('Input'));
    });

    describe('(returned prop decorators `args`)', () => {
      it('should be an empty array if prop decorator has no `args` property', () => {
        const program = makeProgram(INVALID_PROP_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_PROP_DECORATOR_ARGS_FILE.name, 'NoArgsProperty', ts.isVariableDeclaration);
        const members = host.getMembersOfClass(classNode);
        const decorators = members[0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NoArgsPropertyDecorator');
        expect(decorators[0].args).toEqual([]);
      });

      it('should be an empty array if prop decorator\'s `args` has no property assignment', () => {
        const program = makeProgram(INVALID_PROP_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_PROP_DECORATOR_ARGS_FILE.name, 'NoPropertyAssignment', ts.isVariableDeclaration);
        const members = host.getMembersOfClass(classNode);
        const decorators = members[0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NoPropertyAssignmentDecorator');
        expect(decorators[0].args).toEqual([]);
      });

      it('should be an empty array if `args` property value is not an array literal', () => {
        const program = makeProgram(INVALID_PROP_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_PROP_DECORATOR_ARGS_FILE.name, 'NotArrayLiteral', ts.isVariableDeclaration);
        const members = host.getMembersOfClass(classNode);
        const decorators = members[0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NotArrayLiteralDecorator');
        expect(decorators[0].args).toEqual([]);
      });
    });
  });

  describe('getConstructorParameters', () => {
    it('should find the decorated constructor parameters', () => {
      const program = makeProgram(SOME_DIRECTIVE_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SOME_DIRECTIVE_FILE.name, 'SomeDirective', ts.isVariableDeclaration);
      const parameters = host.getConstructorParameters(classNode);

      expect(parameters).toBeDefined();
      expect(parameters!.map(parameter => parameter.name)).toEqual(['_viewContainer', '_template', 'injected']);
      expect(parameters!.map(parameter => parameter.type!.getText()))
          .toEqual(['ViewContainerRef', 'TemplateRef', 'undefined']);
    });

    it('should return an empty array if the symbol is not a class', () => {
      const program = makeProgram(FOO_FUNCTION_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const functionNode = getDeclaration(program, FOO_FUNCTION_FILE.name, 'foo', ts.isFunctionDeclaration);
      const parameters = host.getConstructorParameters(functionNode);

      expect(parameters).toEqual([]);
    });

    it('should return an empty array if there are no decorators', () => {
      const program = makeProgram(SIMPLE_CLASS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, SIMPLE_CLASS_FILE.name, 'SimpleClass', ts.isVariableDeclaration);
      const parameters = host.getConstructorParameters(classNode);

      expect(parameters).toEqual([]);
    });

    it('should return an empty array if there is no constructor parameters', () => {
      const program = makeProgram(INVALID_CTOR_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_CTOR_DECORATORS_FILE.name, 'NoParameters', ts.isVariableDeclaration);
      const parameters = host.getConstructorParameters(classNode);

      expect(parameters).toEqual([]);
    });

    it('should ignore `ctorParameters` if it is not an arrow function', () => {
      const program = makeProgram(INVALID_CTOR_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_CTOR_DECORATORS_FILE.name, 'ArrowFunction', ts.isVariableDeclaration);
      const parameters = host.getConstructorParameters(classNode);

      expect(parameters!.length).toBe(1);
      expect(parameters![0]).toEqual(jasmine.objectContaining({
        name: 'arg1',
        decorators: null,
      }));
    });

    it('should ignore `ctorParameters` if it does not return an array literal', () => {
      const program = makeProgram(INVALID_CTOR_DECORATORS_FILE);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const classNode = getDeclaration(program, INVALID_CTOR_DECORATORS_FILE.name, 'NotArrayLiteral', ts.isVariableDeclaration);
      const parameters = host.getConstructorParameters(classNode);

      expect(parameters!.length).toBe(1);
      expect(parameters![0]).toEqual(jasmine.objectContaining({
        name: 'arg1',
        decorators: null,
      }));
    });

    describe('(returned parameters `decorators`)', () => {
      it('should ignore param decorator elements that are not object literals', () => {
        const program = makeProgram(INVALID_CTOR_DECORATORS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_CTOR_DECORATORS_FILE.name, 'NotObjectLiteral', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);

        expect(parameters!.length).toBe(2);
        expect(parameters![0]).toEqual(jasmine.objectContaining({
          name: 'arg1',
          decorators: null,
        }));
        expect(parameters![1]).toEqual(jasmine.objectContaining({
          name: 'arg2',
          decorators: jasmine.any(Array) as any
        }));
      });

      it('should ignore param decorator elements that have no `type` property', () => {
        const program = makeProgram(INVALID_CTOR_DECORATORS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_CTOR_DECORATORS_FILE.name, 'NoTypeProperty', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);
        const decorators = parameters![0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NoTypePropertyDecorator2'}));
      });

      it('should ignore param decorator elements whose `type` value is not an identifier', () => {
        const program = makeProgram(INVALID_CTOR_DECORATORS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_CTOR_DECORATORS_FILE.name, 'NotIdentifier', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);
        const decorators = parameters![0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0]).toEqual(jasmine.objectContaining({name: 'NotIdentifierDecorator'}));
      });

      it('should use `getImportOfIdentifier()` to retrieve import info', () => {
        const mockImportInfo = {} as Import;
        const spy = spyOn(Esm5ReflectionHost.prototype, 'getImportOfIdentifier').and.returnValue(mockImportInfo);

        const program = makeProgram(SOME_DIRECTIVE_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, SOME_DIRECTIVE_FILE.name, 'SomeDirective', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);
        const decorators = parameters![2].decorators!;

        expect(decorators.length).toEqual(1);
        expect(decorators[0].import).toBe(mockImportInfo);

        const typeIdentifier = spy.calls.mostRecent().args[0] as ts.Identifier;
        expect(typeIdentifier.text).toBe('Inject');
      });
    });

    describe('(returned parameters `decorators.args`)', () => {
      it('should be an empty array if param decorator has no `args` property', () => {
        const program = makeProgram(INVALID_CTOR_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_CTOR_DECORATOR_ARGS_FILE.name, 'NoArgsProperty', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);
        expect(parameters!.length).toBe(1);
        const decorators = parameters![0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NoArgsPropertyDecorator');
        expect(decorators[0].args).toEqual([]);
      });

      it('should be an empty array if param decorator\'s `args` has no property assignment', () => {
        const program = makeProgram(INVALID_CTOR_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_CTOR_DECORATOR_ARGS_FILE.name, 'NoPropertyAssignment', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);
        const decorators = parameters![0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NoPropertyAssignmentDecorator');
        expect(decorators[0].args).toEqual([]);
      });

      it('should be an empty array if `args` property value is not an array literal', () => {
        const program = makeProgram(INVALID_CTOR_DECORATOR_ARGS_FILE);
        const host = new Esm5ReflectionHost(program.getTypeChecker());
        const classNode = getDeclaration(program, INVALID_CTOR_DECORATOR_ARGS_FILE.name, 'NotArrayLiteral', ts.isVariableDeclaration);
        const parameters = host.getConstructorParameters(classNode);
        const decorators = parameters![0].decorators!;

        expect(decorators.length).toBe(1);
        expect(decorators[0].name).toBe('NotArrayLiteralDecorator');
        expect(decorators[0].args).toEqual([]);
      });
    });
  });

  describe('getImportOfIdentifier', () => {
    it('should find the import of an identifier', () => {
      const program = makeProgram(...IMPORTS_FILES);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const variableNode = getDeclaration(program, IMPORTS_FILES[1].name, 'b', ts.isVariableDeclaration);
      const importOfIdent = host.getImportOfIdentifier(variableNode.initializer as ts.Identifier);

      expect(importOfIdent).toEqual({name: 'a', from: './a.js'});
    });

    it('should find the name by which the identifier was exported, not imported', () => {
      const program = makeProgram(...IMPORTS_FILES);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const variableNode = getDeclaration(program, IMPORTS_FILES[1].name, 'c', ts.isVariableDeclaration);
      const importOfIdent = host.getImportOfIdentifier(variableNode.initializer as ts.Identifier);

      expect(importOfIdent).toEqual({name: 'a', from: './a.js'});
    });

    it('should return null if the identifier was not imported', () => {
      const program = makeProgram(...IMPORTS_FILES);
      const host = new Esm5ReflectionHost(program.getTypeChecker());
      const variableNode = getDeclaration(program, IMPORTS_FILES[1].name, 'd', ts.isVariableDeclaration);
      const importOfIdent = host.getImportOfIdentifier(variableNode.initializer as ts.Identifier);

      expect(importOfIdent).toBeNull();
    });
  });
});
