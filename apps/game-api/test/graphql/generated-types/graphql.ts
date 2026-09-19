/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Test_GetTotalPlayersQueryVariables = Exact<{ [key: string]: never; }>;


export type Test_GetTotalPlayersQuery = { totalPlayers: number | null };

export type Test_GetUserProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type Test_GetUserProfileQuery = { profile: { userName: string } | null };

export type Test_GetUserProfileCoinsQueryVariables = Exact<{ [key: string]: never; }>;


export type Test_GetUserProfileCoinsQuery = { profile: { coins: number } | null };

export type Test_GetProfileStashQueryVariables = Exact<{ [key: string]: never; }>;


export type Test_GetProfileStashQuery = { profile: { stash: Array<{ id: string, quantity: number }> | null } | null };

export type Test_SellItemMutationVariables = Exact<{
  itemId: string;
  quantity: number;
}>;


export type Test_SellItemMutation = { sellItem: { coins: number } | null };

export type Test_BuyItemMutationVariables = Exact<{
  itemId: string;
  quantity: number;
}>;


export type Test_BuyItemMutation = { buyItem: { coins: number } | null };

export type Test_GetProfileShipsQueryVariables = Exact<{ [key: string]: never; }>;


export type Test_GetProfileShipsQuery = { profile: { ships: Array<{ id: string, shipId: string }> | null } | null };

export type Test_BuyShipMutationVariables = Exact<{
  shipId: string;
}>;


export type Test_BuyShipMutation = { buyShip: { id: string, shipId: string } | null };


export const Test_GetTotalPlayersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Test_GetTotalPlayers"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalPlayers"}}]}}]} as unknown as DocumentNode<Test_GetTotalPlayersQuery, Test_GetTotalPlayersQueryVariables>;
export const Test_GetUserProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Test_GetUserProfile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userName"}}]}}]}}]} as unknown as DocumentNode<Test_GetUserProfileQuery, Test_GetUserProfileQueryVariables>;
export const Test_GetUserProfileCoinsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Test_GetUserProfileCoins"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coins"}}]}}]}}]} as unknown as DocumentNode<Test_GetUserProfileCoinsQuery, Test_GetUserProfileCoinsQueryVariables>;
export const Test_GetProfileStashDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Test_GetProfileStash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"stash"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"quantity"}}]}}]}}]}}]} as unknown as DocumentNode<Test_GetProfileStashQuery, Test_GetProfileStashQueryVariables>;
export const Test_SellItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Test_SellItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sellItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coins"}}]}}]}}]} as unknown as DocumentNode<Test_SellItemMutation, Test_SellItemMutationVariables>;
export const Test_BuyItemDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Test_BuyItem"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buyItem"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"itemId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"itemId"}}},{"kind":"Argument","name":{"kind":"Name","value":"quantity"},"value":{"kind":"Variable","name":{"kind":"Name","value":"quantity"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"coins"}}]}}]}}]} as unknown as DocumentNode<Test_BuyItemMutation, Test_BuyItemMutationVariables>;
export const Test_GetProfileShipsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Test_GetProfileShips"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profile"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"ships"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"shipId"}}]}}]}}]}}]} as unknown as DocumentNode<Test_GetProfileShipsQuery, Test_GetProfileShipsQueryVariables>;
export const Test_BuyShipDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Test_BuyShip"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"shipId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"buyShip"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"shipId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"shipId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"shipId"}}]}}]}}]} as unknown as DocumentNode<Test_BuyShipMutation, Test_BuyShipMutationVariables>;