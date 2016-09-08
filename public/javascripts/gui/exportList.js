"use strict";
const SortedSet = require('collections/sorted-set');

const GeneEvent = require('../genes/geneEvent');

/**
 * This entire class should offer to write up a gene set to the database.
 * @param g
 * @param context
 * @constructor
 */

function ExportList(g, context) {
    this.genes = g; /** {GeneList} */
    this.context = context; /** {AppletContext} */
    this.localUpdate = false;
    this.groupCnt = 0;
    this.table = document.getElementById('controlFtable');
    this.model = new ExportModel();

    this.removeB = document.getElementById('removeB');
    this.removeB.title = "Remove the selected sets of items";

    this.exportB = document.getElementById('exportB');
    this.exportB.title = "Send the selected sets of items to an external program";

    let that = this;    // TODO: Refactor
    this.removeB.addEventListener("click", function() {
        that.model.deleteSelected();
    });
    this.exportB.addEventListener("click", function() {
        console.log("List size: " + that.model.getList().length);
        for (let i = 0; i < that.model.getList().length; i++) {
            const l = that.model.getList()[i];
            console.log(l.name + " (" + l.genes.length + ")"); // TODO: @Dennis check back to make sure it should be genes.length
        }
        that.exportGeneList();
    });
    document.getElementById('controlFtableHeader').addEventListener("click", function() {
        // Lines 115 - 119 allow the header rows to be manipulated
    });
    document.getElementById('controlFtableAdd').addEventListener("click", function() {
        that.selectAll();
    });
    g.addGeneListener(this);
}

ExportList.prototype = {
    constructor : ExportList,
    cleanup : function() {
        this.model.cleanup();
        this.model = null;
        this.table = null;
        this.genes = null;
    },
    /**
     * Convenience method that creates a POST method form submit
     * and reads the response.
     * @param cgi the URL to which the form should be submitted
     * @param data the form data
     * @return the text response
     * @throws IOException
     */
    post : function(cgi, data) {
        // TODO: Implement.
    },
    /**
     * TODO: @Dennis figure this out to be less stupid.
     * @param node
     * @param row
     * @param col
     */
    mouseListener : function(node, row, col) {
        if (row != -1) {
            var l = this.model.getList()[row];
            let s = new SortedSet(this.genes.getSelectedSet().toArray());
            this.localUpdate = true;
            switch (col) {
                case 3:
                    s = s.union(l.genes);
                    this.genes.setSelection(this, s);
                    break;
                case 4:
                    s = new SortedSet(l.genes);
                    this.genes.setSelection(this, s);
                    break;
                case 5:
                    for (let i = 0; i < l.genes.length; i++) {
                        s.remove(l.genes[i]);
                    }
                    this.genes.setSelection(this, s);
                    break;
                case 6:
                    this.model.setCurrent(l);
                    this.genes.setActive(this, l.genes);
                    // TODO: Possibly call a table.repaint?
                    break;
            }
            this.localUpdate = false;
        }
    },
    exportCellStorm : function() {
        try {
            let gl = "";
            const selectedGenes = this.genes.getSelectedSet().toArray();
            selectedGenes.forEach((gene) => {
                if (gl != "") {
                    gl += "|";
                }
                gl += gene.getName();
            });
            // TODO: Get runtime?
        } catch (e) {
            console.log("ERROR (from exportList.exportCellStorm:");
            console.log(e);
        }
    },
    exportGeneList : function() {
        try {
            const data = this.getExportsGeneList();
            console.log(data);
            const exportU = this.genes.getSource().getAttributes().get("export_url");
            const res = this.post(exportU, data);
            console.log("response: ");
            console.log(res);
            const h = new Map(); /** String => String */
            const p = res.split('&');
            p.forEach((token) => {
                const nvp = token.split("=");
                h.set(nvp[0], nvp[1]);
            });
            console.log("export response pairs:");
            console.log(h);
            if (this.context !== null) {
                try {
                    let url = h.get("url");
                    console.log("url: " + url);
                    if (typeof url !== 'undefined') {
                        let u = new URL(url); // TODO: Ensure this works.
                        const target = h.get("target");
                        console.log("u: " + u + ", target : |" +  (typeof target !== 'undefined' ? target : null) + "|");
                        if (typeof target !== 'undefined') {
                            u = new URL(target, u); // Might need to be url instead of u
                        }
                        const win = window.open(u);
                        if (win) {
                            win.focus();
                        } else {
                            alert('Please enable popups on this site to export gene lists');
                        }
                        alert('Export Complete'); // Maybe refactor?
                    } else {
                        alert('Export Warning: no response page given');
                    }
                } catch (re) {
                    alert('Export Warning: could not show response page');
                }
            }
        } catch (e) {
            alert('Export Error');
            console.log(e);
        }
    },
    /**
     * Formats the exports list as a pair of StringBuffer that contain
     * gene and group information, respectively.  The first StringBuffer
     * is a list of genes, one gene per line.  The second contains
     * gene/group associations in Cytoscape .noa file format.
     * @return {Array} the two StringBuffers as a Vector
     */
    getExportsCytoscape : function () {
        const ent = this.model.getList(); // Maybe??
        const v = [];
        let sif = "";   // list of all genes
        let s = new SortedSet();
        ent.forEach((entry) => {
            //noinspection JSUnresolvedFunction
            s = s.union(entry.genes);
        });
        let noa = "";   // gene group membership
        noa += "Group\n";
        //noinspection JSUnresolvedFunction
        const sArray = s.toArray();
        sArray.forEach((g) => {
            sif += g + "\n";
            let gTag = "";
            ent.forEach((entry) => {
                if (entry.genes.contains(g)) {
                    if (gTag != "") {
                        gTag += "+";
                    }
                    gTag += entry.name;
                }
            });
            noa += g + " = " + gTag + "\n";
        });
        v.push(sif);
        v.push(noa);
        return v;
    },
    /**
     * Formats the exports list as form data for the gene list export.
     * Form data is name/value pairs.  For each NVP, the name is the group
     * name, and the value is a &quot;|&quot;-delimited list of genes in
     * the group.
     * @return {String} the gene list form data
     */
    getExportsGeneList : function() {
        const nvp = [];
        const attrib = this.genes.getSource().getAttributes();
        const exportRegex = new RegExp("export_", "i");
        const keys = attrib.keys();
        let next = keys.next();
        while(!next.done) {
            const k = next.value;
            if (exportRegex.test(k) && k != "export_url") {
                this.addPair(nvp, k.substr(7), attrib.get(k));
            }
        }
        // gather group/gene information
        const modelList = this.model.getList();
        const groups = [];
        const genes = [];
        let that = this;    // TODO: refactor. Watch egghead.io's tutorial on es6
        modelList.forEach((e) => {
            if (e.selected) {
                groups.push(e.name);
                genes.push(e.name + "=" + that.separate(e.genes, "|", true));
            }
        });
        this.addPair(nvp, "groups", this.separate(groups, "|", false));
        genes.forEach((gene) => {
            nvp.push(gene);
        });
        const exp = this.separate(nvp, "&", false);
        console.log(exp);
        return exp;
    },
    /**
     * Updates the column names and tool tips based on the current data items type.
     * Deals with the stupid column-sizing issue on column name change.
     */
    updateGUI : function() {
        const iL = this.genes.getSource().getAttributes().get("itemsLabel", "items");
        this.removeB.title = "Remove the selected sets of " + iL;
        this.exportB.title = "Send the selected sets of " + iL + " to an external program";
        // TODO: Finish
    },
    setColumnToolTip : function(col, text) {
        // TODO: Implement
    },
    /**
     * @param nvp {Array} of Strings
     * @param name {string}
     * @param value {string}
     */
    addPair : function(nvp, name, value) {
        nvp.push(name + "=" + value);
    },
    /**
     * @param c {Object}
     * @param sep {string}
     * @param escape {bool}
     * @returns {string}
     */
    separate : function(c, sep, escape) {
        let f = true;
        if (!Array.isArray(c)) {
            c = c.toArray();
        }
        let s = "";
        c.forEach((item) => {
            if (!f) s += sep;
            f = false;
            s += item;
        });
        return escape ? new URL(s) : s; // TODO: Ensure this is correct.
    },
    /**
     * @param e {GeneEvent}
     */
    listUpdated : function(e) {
        switch (e.getType) {
            case GeneEvent.NEW_LIST:
                this.model.clear();
                this.model.setCurrent(this.addGroup());
                const hasExport = this.genes.getSource().getAttributes().get("export_url");
                this.exportB.className = (typeof hasExport !== 'undefined' ? ExportList.ENABLED : ExportList.DISABLED);
                this.updateGUI();
                break;
            case GeneEvent.RESTART:
                this.model.resetCurrent();
                this.model.setCurrent(this.addGroup());
                break;
            case GeneEvent.NARROW:
                if (!this.localUpdate) this.addGroup();
                break;
            default:
                break;
        }
    }
};

ExportList.ENABLED = "btn btn-primary";
ExportList.DISABLED = "btn btn-primary disabled";

function getPasswordAuthentication() {
    // TODO: Implement
}

function ListEntry(name, genes, parent) {
    this.name = name;       /** {String} */
    this.genes = genes;     /** {SortedSet<Gene>} */
    this.parent = parent;   /** {ListEntry} */
    this.selected = false;  /** {boolean} */
    this.children = [];     /** {Vector<ListEntry>} */
    if (this.parent !== null) {
        parent.addChild(this);
    }
    this.indent = (this.parent === null ? 0 : this.parent.indent+1);    /** {int} */
    this.extra = {};        /** {Hashtable<Object, Object>} */
}

ListEntry.prototype = {
    constructor : ListEntry,
    addChild : function(c) {
        this.children.push(c);
    },
    removeChild : function(c) {
        var index = this.children.indexOf(c);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }
};

function ExportModel() {
    this.titles = [ "+/-", "Name", "", "", "", "", "" ];
    this.setType("Items");
    this.goI = document.createElement('span');
    this.goI.className = "glyphicon glyphicon-play";
    this.unI = document.createElement('span');
    this.unI.className = "glyphicon glyphicon-plus-sign";
    this.intI = document.createElement('span');
    this.intI.className = "glyphicon glyphicon-adjust";
    this.subI = document.createElement('span');
    this.subI.className = "glyphicon glyphicon-minus-sign";
    this.exportList = [];
    this.root = new ListEntry("root", new SortedSet(), null);
    this.curr = this.root;
}

ExportModel.prototype = {
    constructor : ExportModel,
    cleanup : function() {
        this.exportList = null;
    },
    setType : function(s) {
        this.titles[2] = "# " + s;
    },
    getColumnCount : function() {
        return this.titles.length;
    },
    getRowCount : function() {
        return this.exportList.length;
    },
    getColumnName : function(col) {
        return this.titles[col];
    },
    isCellEditable : function(row, col) {
        return col == 0 || col == 1;
    },
    getColumnClass : function(c) {
        if (c > 2) {
            // TODO: @Dennis Implement
        } else {

        }
    },
    getValueAt : function(row, col) {
        switch(col) {
            case 0:
                return this.exportList[row].selected;
            case 1:
                return this.exportList[row].name;
            case 2:
                return this.exportList[row].genes.size()+"";
            case 3:
                return this.unI;
            case 4:
                return this.intI;
            case 5:
                return this.subI;
            case 6:
                return this.goI;
            default:
                return "";
        }
    },
    setValueAt : function(aValue, row, col) {
        switch(col) {
            case 0:
                this.exportList[row].selected = !this.exportList[row].selected;
                break;
            case 1:
                this.exportList[row].name = aValue;
                break;
        }
    },
    buildListRec : function(r) {
        if (r != root) {
            this.exportList.push(r);
        }
        for (var i = 0; i < r.children.length; i++) {
            this.buildListRec(r.children[i]);
        }
    },
    buildList : function() {
        this.exportList = [];
        this.buildListRec(this.root);
        // fireTableDataChanged ?
    },
    clear : function() {
        // TODO: Ensure this function works.
        this.resetCurrent();
        var q = [];
        var r = [];
        q.push(this.root);
        while(q.length > 0) {
            var e = q[0];
            q.splice(0, 1);
            r.unshift(e);
            for (var i = 0; i < q.length; i++) {
                q.push(e[i]);
            }
        }
        for (var it = 0; it < r.length; i++) {
            var e = r[it];
            e.children = [];
            e.parent = null;
        }
        this.buildList();
    },
    setCurrent : function(e) {
        this.curr = e;
    },
    resetCurrent : function() {
        this.curr = this.root;
    },
    addGroup : function(name, s) {
        var e = new ListEntry(name, s, this.curr);
        this.buildList();
        this.scrollTo(e);
        this.setCurrent(e);
        return e;
    },
    scrollTo : function(e) {
        var row = this.exportList.indexOf(e);
        // TODO: @Dennis implement line 606 (scroll to in table)
    },
    /**
     * delete all selected elements from export list,
     * except for current element and its parents
     */
    deleteSelected : function() {
        // find hierarchy roots
        var rootList = [];
        var l = null;
        var it = 0;
        var i = 0;
        for (it = 0; it < this.exportList.length; it++) {
            l = this.exportList[it];
            if (l.parent == this.root) {
                rootList.push(l);
            }
        }
        // get current entry and parents
        var currList = [];
        var tmp = this.curr;
        do {
            currList.push(tmp);
            tmp = tmp.parent;
        } while (tmp != this.root);
        // prefix tree traversal: at each node:
        //   if marked for deletion && not in currList
        //     recursively add node and all children to delete list
        //   else add children to queue, progress to next node
        var delList = [];
        var noDelList = [];
        var queue = [];
        for (i = 0; i < rootList.length; i++) {
            queue.push(rootList[i]);
        }
        while (queue.length > 0) {
            l = queue[0];
            queue.splice(0, 1);
            var c = l;
            var del = l.selected;
            while(c.parent != this.root) {
                c = c.parent;
                del |= c.selected;
            }
            if (del && currList.indexOf(l) < 0) {
                var p = delList.length;
                delList.push(l);
                while (p < delList.length) {
                    var d = delList[p];
                    for (i = 0; j < d.children.length; i++) {
                        delList.push(d[i]);
                    }
                    p++;
                }
            } else {
                if (del) {
                    noDelList.push(l);
                }
                for (i = 0; i < l.children.length; i++) {
                    queue.push(l[i]);
                }
            }
        }
        if (!(delList.length < 1 && noDelList.length < 1)) {
            var msg = "";
            if (delList.length > 0) {
                msg += "Deleting the following groups (selected groups and their child groups):\n";
                for (it = 0; it < delList.length; i++) {
                    l = delList[it];
                    for (i = 0; i < l.indent; i++) {
                        msg += "\t";
                    }
                    msg += l.name + "\n";
                }
            }
            if (noDelList.length > 0) {
                msg += "Could not delete the following groups (current group and parent groups):\n";
                for (it = 0; it < noDelList.length; it++) {
                    l = noDelList[it];
                    for (i = 0; i < l.indent; i++) {
                        msg += "\t";
                    }
                    msg += l.name + "\n";
                }
            }
            var status = 0; // FIXME: @Dennis implement lines 673 & 674
            if (status == OK_OPTION) {
                for (it = 0; it < delList.length; it++) {
                    l = delList[it];
                    var idx = l.parent.children.indexOf(l);
                    if (idx > -1) {
                        l.parent.children.splice(idx, 1);
                    }
                    l.parent = null;
                    l.children = [];
                }
                this.buildList();
            }
        }
    },
    getList : function() {
        return this.exportList;
    },
    listUpdated : function(e) {
        // console.log("Export list updated!");
    }
};

module.exports = ExportList;