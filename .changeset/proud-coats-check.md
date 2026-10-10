---
'typestyles': patch
---

Fix flat `createTypeStyles` `recipe` typing ([#254](https://github.com/type-styles/typestyles/issues/254)): the factory overloads now discriminate on `mode` and `layers`, so `mode: 'attribute'` factories return attribute recipes (`{ className, attrs, props }` results) and layered factories get a `{ layer }` override checked against `layers.order`. The loose `(namespace, config: any, options?) => any` intersection that degraded callback configs and call results to `any` is gone. New exported types: `SemanticRecipeFn`, `LayeredSemanticRecipeFn`, `AttributeRecipeFn`, `LayeredAttributeRecipeFn`; `TypeStylesApi` is now generic over the recipe signature (`TypeStylesApi<Recipe>`) with the previous shape as default.
