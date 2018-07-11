/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ts from 'typescript';
import { ClassMember, Decorator, Import, Parameter } from '../../../ngtsc/host';
import { Esm2015ReflectionHost } from './esm2015_host';

const DECORATORS = 'decorators' as ts.__String;

/**
 * ESM5 packages contain ECMAScript IIFE functions that act like classes. For example:
 *
 * ```
 * var CommonModule = (function () {
 *  function CommonModule() {
 *  }
 *  CommonModule.decorators = [ ... ];
 * ```
 *
 * * "Classes" are decorated if they have a static property called `decorators`.
 * * Members are decorated if there is a matching key on a static property
 *   called `propDecorators`.
 * * Constructor parameters decorators are found on an object returned from
 *   a static method called `ctorParameters`.
 *
 */
export class Esm5ReflectionHost extends Esm2015ReflectionHost {
  constructor(checker: ts.TypeChecker) {
    super(checker);
  }

  /**
   * In ESM5 the implementation of a class is a function expression that is hidden inside an IIFE.
   * So we need to dig around inside to get hold of the "class" symbol.
   * @param declaration the top level declaration that represents an exported class.
   */
  getClassSymbol(declaration: ts.Declaration) {
    if (ts.isVariableDeclaration(declaration)) {
      const name = declaration.name;
      const iifeBody = getIifeBody(declaration);
      if (iifeBody) {
        const innerClassIdentifier = getReturnIdentifier(iifeBody);
        if (innerClassIdentifier) {
          return this.checker.getSymbolAtLocation(innerClassIdentifier);
        }
      }
    }
  }

  /**
   * Find the declarations of the constructor parameters of a class identified by its symbol.
   * In ESM5 there is no "class" so the constructor that we want is actually the declaration
   * function itself.
   */
  protected getConstructorParameterDeclarations(classSymbol: ts.Symbol) {
    debugger;
    const constructor = classSymbol.valueDeclaration as ts.FunctionDeclaration;
    if (constructor && constructor.parameters) {
      return Array.from(constructor.parameters);
    }
    return [];
  }
}


function getIifeBody(declaration: ts.VariableDeclaration) {
  if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
    const call = declaration.initializer;
    if (ts.isParenthesizedExpression(call.expression) && ts.isFunctionExpression(call.expression.expression)) {
      return call.expression.expression.body;
    }
  }
}

function getReturnIdentifier(body: ts.Block) {
  const returnStatement = body.statements.find(statement => ts.isReturnStatement(statement)) as ts.ReturnStatement|undefined;
  if (returnStatement && returnStatement.expression && ts.isIdentifier(returnStatement.expression)) {
    return returnStatement.expression;
  }
}