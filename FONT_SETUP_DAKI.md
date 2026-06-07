# Daki font setup

The CSS is already wired for these font files:

- DakiMTitle.ttf -> titles
- DakiB.ttf -> emphasized text
- DakiM.ttf -> normal body text
- DakiL.ttf -> secondary/light text

Because font files are not redistributed in this ZIP, copy your licensed font files into both folders before committing if you want web deployment to use them:

```text
public/fonts/
docs/fonts/
```

Required final paths:

```text
public/fonts/DakiMTitle.ttf
public/fonts/DakiB.ttf
public/fonts/DakiM.ttf
public/fonts/DakiL.ttf
docs/fonts/DakiMTitle.ttf
docs/fonts/DakiB.ttf
docs/fonts/DakiM.ttf
docs/fonts/DakiL.ttf
```

If you install the fonts on your Mac, the site may use the local fonts through `local(...)`, but external users need the files served from `docs/fonts`.
