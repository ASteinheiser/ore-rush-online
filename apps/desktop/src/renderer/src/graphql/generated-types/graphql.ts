/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Desktop_BuyShipMutationVariables = Exact<{
  shipId: string;
}>;


export type Desktop_BuyShipMutation = { buyShip: { id: string, shipId: string } | null };

export type Desktop_BuyItemMutationVariables = Exact<{
  itemId: string;
  quantity: number;
}>;


export type Desktop_BuyItemMutation = { buyItem: { coins: number } | null };

export type Desktop_SellItemMutationVariables = Exact<{
  itemId: string;
  quantity: number;
}>;


export type Desktop_SellItemMutation = { sellItem: { coins: number } | null };

export type Desktop_GetProfileShipsQueryVariables = Exact<{ [key: string]: never; }>;


export type Desktop_GetProfileShipsQuery = { profile: { selectedShipId: string | null, ships: Array<{ id: string, shipId: string }> | null } | null };

export type Desktop_SelectShipMutationVariables = Exact<{
  shipId: string;
}>;


export type Desktop_SelectShipMutation = { selectShip: { selectedShipId: string | null } | null };

export type Desktop_GetProfileStashQueryVariables = Exact<{ [key: string]: never; }>;


export type Desktop_GetProfileStashQuery = { profile: { coins: number, stash: Array<{ id: string, quantity: number }> | null } | null };


export const Desktop_BuyShipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Desktop_BuyShip"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buyShip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shipId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"shipId"}}]}}]}}]} as unknown as DocumentNode<Desktop_BuyShipMutation, Desktop_BuyShipMutationVariables>;
export const Desktop_BuyItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Desktop_BuyItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buyItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coins"}}]}}]}}]} as unknown as DocumentNode<Desktop_BuyItemMutation, Desktop_BuyItemMutationVariables>;
export const Desktop_SellItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Desktop_SellItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sellItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coins"}}]}}]}}]} as unknown as DocumentNode<Desktop_SellItemMutation, Desktop_SellItemMutationVariables>;
export const Desktop_GetProfileShipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Desktop_GetProfileShips"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectedShipId"}},{"kind":"Field","name":{"kind":"Name","value":"ships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"shipId"}}]}}]}}]}}]} as unknown as DocumentNode<Desktop_GetProfileShipsQuery, Desktop_GetProfileShipsQueryVariables>;
export const Desktop_SelectShipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Desktop_SelectShip"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectShip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shipId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectedShipId"}}]}}]}}]} as unknown as DocumentNode<Desktop_SelectShipMutation, Desktop_SelectShipMutationVariables>;
export const Desktop_GetProfileStashDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Desktop_GetProfileStash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coins"}},{"kind":"Field","name":{"kind":"Name","value":"stash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}}]}}]}}]} as unknown as DocumentNode<Desktop_GetProfileStashQuery, Desktop_GetProfileStashQueryVariables>;