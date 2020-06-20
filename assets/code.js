/*
  Todo:
      Change datasource rutime
      Get weight from inputs  
      round?
       
*/
var Calculator = function () {
    var Calculator = this;
    this.settings = {
        url: "3_6_2h.csv",
        $parentItem: $("#tree")
    },    
        this.InflationData = new Array(),

        this.kshRound = function(num, rounding){
          return num;
          return Math.round(num * rounding) / rounding ;
       
        }
        this.init = function () {
            this.loadData();
        },
        this.getSelectedNodes = function () {
            return $.map($.ui.fancytree.getTree("#tree").getSelectedNodes(), function (node) {
                if (node.key.length == 3) return node;
            });
        },
        this.CalcInflacio = function () {
            selNodes = this.getSelectedNodes();

            let sumweight = 0.0;
            sumweight = selNodes.reduce(function (sumweight, o) {
                return sumweight +  (o.data.suly);
            }, 0)
          
            let finalInf = 0;
            if (selNodes.length > 0) {
                selNodes.forEach(x => {
                    finalInf += kshRound(  x.data.infla * x.data.suly,10);
                  //  console.log(x.data.infla + "*" + x.data.suly + " = "+ x.data.infla * x.data.suly)
                   // console.log("summa:"  + kshRound(  x.data.infla * x.data.suly,1))
                });
                console.log(finalInf)
                console.log(sumweight + " avagy" + kshRound(sumweight,100))
                
                finalInf /= kshRound(sumweight,100);
            }
            $('#inflacio').text(   Math.round ( finalInf * 10   ) / 10);
        },

        this.initTree = function () {

            $("#tree").fancytree({
                extensions: ["table"],
                checkbox: true,
                selectMode: 3,
                minExpandLevel: 1,
                source: (Calculator.InflationData),
                titlesTabbable: true,
                table: {
                    nodeColumnIdx: 1,     // render the node title into the 2nd column          
                },
                select: function (event, data) {
                    Calculator.CalcInflacio()
                },
                init: function(){
                  $.ui.fancytree.getTree("#tree").expandAll();
                },
                renderColumns: function (event, data) {
                    var node = data.node,
                        $tdList = $(node.tr).find(">td");

                    $tdList
                        .eq(2)
                        .find("span")
                        .text(node.data.infla);

                    $tdList
                        .eq(3)
                        .find("input")
                        .val(node.data.suly);
                }
            });
        },

        this.loadData = function () {
            $.ajax({
                url: this.settings.url
            }).done(function (data) {
                data.split("\n").forEach(el => {
                    if(el.trim().length == 0) return;
                    
                    let element = el.split(";");
                    let id = element[0];
                    let text = element[1].trim().replace("\"", "");
                    let suly = parseFloat(element[2]);
                    let infla = element[3];
 
                    if (id == "" || id == null || id.indexOf("–") > -1 || id.indexOf("-") > -1) { }
                    else {
                        let subID1 = id.substring(0, 1);
                        let subID2 = id.substring(0, 2);
                        let obj = {
                            title: text,
                            infla: infla,
                            suly: suly,
                            key: id
                        }

                        if (Calculator.InflationData.find(x => x.key == subID1) == null)
                            Calculator.InflationData.push({ title: "", key: subID1, folder: true, children: [] });

                        if (id.length == 1) {
                            Object.assign(Calculator.InflationData.find(x => x.key == subID1), obj);
                            return;
                        }

                        if (Calculator.InflationData.find(x => x.key == subID1).children.find(x => x.key == subID2) == null)
                            Calculator.InflationData.find(x => x.key == subID1).children.push({ title: "", folder: true, key: subID2, children: [] });

                        if (id.length == 2) {
                            Object.assign(Calculator.InflationData.find(x => x.key == subID1).children.find(x => x.key == subID2), obj);
                            return;
                        }

                        Calculator.InflationData.find(x => x.key == subID1).children.find(x => x.key == subID2).children.push({ title: text, key: id, infla: infla, suly: suly });
                    }
                });
                Calculator.initTree();
            });
        }

    this.init()
}();