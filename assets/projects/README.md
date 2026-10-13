# Screenshots dos projetos

Uma imagem por projeto, com o `id` dele no nome:

- `finora.webp`
- `smartvagas.webp`
- `ecoway.webp`

## Formato

- **1600 × 1000 px** (proporção 16:10). Outras proporções são cortadas para caber no quadro.
- **WebP**, qualidade entre 75 e 85. O ideal é ficar abaixo de 200 KB.
- Mostre a tela principal do projeto. Evite mockups com moldura de notebook ou celular: o site já cria o quadro.

Depois, informe a imagem em `src/data/projects.js`:

```js
image: {
  src: 'assets/projects/finora.webp',
  alt: 'Descreva o que aparece na tela',
},
```

O `alt` deve descrever o que a tela mostra, não apenas repetir o nome do projeto.
