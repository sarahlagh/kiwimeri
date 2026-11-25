### document

- [x] add a document: doc3
- [x] update document (row update, content): doc2
- [x] update document (non row update, order): doc2
- [x] move document 
   - [x] wasn't the newest, is the newest: doc2 to fol1
   - [x] wasn't the newest, isn't the newest: doc2 to N3
   - [x] was the newest, is the newest: doc7 to fol5
   - [x] was the newest, isn't the newest: doc3 to N3
- [x] delete document
  - [x] was the newest: doc7
  - [x] wasn't the newest: doc6
  - [ ] TODO later: hard delete with and without annots

### folder

- [x] add a folder: fol3
- [x] update folder (row update, title): fol2
- [x] update folder (non row update): fol2
- [x] move folder 
   - [x] wasn't the newest, is the newest: fol2 to fol1
   - [x] wasn't the newest, isn't the newest: fol2 to fol3
   - [x] was the newest, is the newest: fol4 to N5 
   - [x] was the newest, isn't the newest: fol3 to N3
- [x] delete folder
  - [x] was the newest: fol3
  - [x] wasn't the newest: fol1
  - [x] delete children: was the newest: fol4
  - [x] delete children: wasn't the newest: fol2
  - [x] move children up: fol2 to fol1

### notebook

- [x] add a notebook: N4
- [x] update notebook (row update, title): N3
- [x] update notebook (order): N3
- [x] move notebook 
   - [x] wasn't the newest, is the newest: N3 to N2
   - [x] wasn't the newest, isn't the newest: N3 to N1
   - [x] was the newest, is the newest: N6 to N2
   - [x] was the newest, isn't the newest: N1 to N6
   - [x] to root: N1 to root
- [x] delete notebook
  - [x] was the newest: N4
  - [x] ~~wasn't the newest: N3~~
  - [x] at root: N5
  - [x] delete children: was the newest: N1
  - [x] delete children: wasn't the newest: N3

### annot

- [x] add an annot: annot1
- [x] update annot (row update, content): annot1
- [x] update annot (non row update, order): annot1 (skip single op)
- [x] delete annot 
   - [x] annot was the newest: annot4
   - [x] annot wasn't the newest: annot3
   - [x] doc was the newest: annot2
   - [x] doc wasn't the newest: annot1

```
0
   ~~N1~~
   N2
      fol1
      fol2
         doc1
            annot1
         doc2
         doc3
      fol3
   N3
      doc4
   N1
      N4 // created after doc4
N5
N6
   ~~fol4~~
   fol5
      doc6
      doc5 // created before doc6
         annot2 // created after doc6
   fol4 // created before fol5
      doc7
        annot3
        annot4
```
