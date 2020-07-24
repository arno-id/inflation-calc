/*
    save icon
    clipboard
    
*/
(function ($) {
    $.Calculator = this;

    this.InflationData = new Array(),
        this.RawSource = "",
        this.settings = {
            url: "3_6_2h.csv",
            tree: "#tree",
            budget: "#budget",
            userSpendings: ".osszeg",
            userWeight: ".ownWeight",
            userBudget: "#havikeret",
            modalTextarea: "#adatforras",
            ModalSave: "#ModalSave",
            ModalID: "#adatForrasModal",
            budgetModalTextarea: "#budgetforras",
            budgetModalSave: "#BudgetModalSave",
            budgetModalID: "#adatMentes",
            $tree: $(this.tree)
        },

        this.kshRound = function (num, rounding) {
            return (Math.round(num * 100000) / 100000).toFixed(rounding);
        },

        this.ScrollToNode = function (node) {
            $("body,html").animate(
                {
                    scrollTop: $($.ui.fancytree
                        .getTree($.Calculator.settings.tree)
                        .getNodeByKey(node.toString()).tr).offset().top - $($.Calculator.settings.tree + ' thead').height()
                },
                800 //speed
            );
        },

        this.FormatNumber = function ($elem, useHTML) {
            var selection = window.getSelection().toString();
            if (selection !== '') return;
            if ($.inArray(event.keyCode, [38, 40, 37, 39]) !== -1) return;
            var $this = $elem;
            var input = useHTML == 1 ? $this.html() : $this.val();            
            let negative = false;
            if (input.substring(0, 1) == "-") negative = true;
            var input = input.replace(/[\D\s\._]+/g, "");
            if (negative) input = "-" + input;
            input = input ? parseInt(input, 10) : 0;
         
            if (useHTML == 1)
                $this.html(function () {
                    return (input === 0) ? "" : input.toLocaleString("hu-HU");
                });
            else
                $this.val(function () {
                    return (input === 0) ? "" : input.toLocaleString("hu-HU");
                });
        },
        this.init = function () {
            $(function () {
                $(document).on("keyup", ($.Calculator.settings.userBudget + ', ' + $.Calculator.settings.userSpendings), function (event) {
                    $.Calculator.FormatNumber($(this))
                });
                $.Calculator.loadData();
                $($.Calculator.settings.userBudget).data('manuallyChanged', 0); 

                $($.Calculator.settings.budgetModalID).on('shown.bs.modal', function () {                 
                    $.Calculator.LoadDataToSave();
                });
            })

            $(document).on("keyup", "" + $.Calculator.settings.userBudget, function () {
                $($.Calculator.settings.userBudget).data('manuallyChanged', $($.Calculator.settings.userBudget).val() == "" ? 0 : 1);
                $.Calculator.CalcBudget();
            });

            $(document).on("keyup", $.Calculator.settings.userSpendings, function (event) {
                $.Calculator.CalcBudget();
            });
 
            $(document).on("click", $.Calculator.settings.budgetModalSave, function (event) {
                $.Calculator.RestoreSavedData();           
            });
            

            $(document).on("click", $.Calculator.settings.ModalSave, function (event) {
                $.Calculator.InflationData = new Array();
                $.Calculator.RawSource = $($.Calculator.settings.modalTextarea).val();
                $.Calculator.ParseRawData();
                $.ui.fancytree.getTree($.Calculator.settings.tree).reload($.Calculator.InflationData)
                $($.Calculator.settings.ModalID).modal('hide')
            });

        },
        this.getSelectedNodes = function () {
            return $.map($.ui.fancytree.getTree($.Calculator.settings.tree).getSelectedNodes(), function (node) {
                if (node.key.length == 3) return node;
            });
        },
        this.LoadDataToSave = function(){
            let SaveData = [];          
            $($.Calculator.settings.userSpendings).each(function (e, v) {
                if($(this).val() != "")
                {
                    let curNodeKey = $(this).data('node'); 
                    let curspending = $.Calculator.GetPlainNuber($(this).val());
                    SaveData.push(curNodeKey+";"+curspending);
                }
            }); 
            $($.Calculator.settings.budgetModalTextarea).val(SaveData.join('\n'));
        },
        this.ClearSpendings = function(){
            $($.Calculator.settings.userSpendings).each(function (e, v) {
                $(this).val('')
            });
        },
        this.RestoreSavedData = function(){
            let data = $($.Calculator.settings.budgetModalTextarea).val().trim().split('\n');
            $.Calculator.ClearSpendings();
            data.forEach(x => {
                let row = x.trim().split(';');
                if(row.length == 2){
                    $.Calculator.SetNodeSpending(row[0], row[1]);
                }  
            });
            $.Calculator.CalcBudget();
            $($.Calculator.settings.budgetModalID).modal('hide')
        },     
        this.GetInflactionValue = function (key) {
            let item = $.Calculator.InflationData.find(x => x.key == key.substring(0, 1));
            if (key.length == 1) return item;
            item = item.children.find(x => x.key == key.substring(0, 2));
            if (key.length == 2) return item;
            item = item.children.find(x => x.key == key);
            return item;

        },
        this.initTree = function () {
            $(this.settings.tree).fancytree({
                extensions: ["table"],
                checkbox: true,
                selectMode: 3,
                minExpandLevel: 1,
                keyboard: false,
                source: ($.Calculator.InflationData),
                table: {
                    nodeColumnIdx: 1
                },
                select: function (event, data) {
                    $.Calculator.CalcBudget()
                    $.Calculator.CalcKshInflations();
                },
                init: function () {
                    $.ui.fancytree.getTree($.Calculator.settings.tree).expandAll();
                    $.Calculator.CalcKshInflations();
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
                        .find("span")
                        .text(node.data.suly);

                    $tdList
                        .eq(4)
                        .find("input")
                        .data('node', node.key);
                }
            });
        },

        this.loadData = function () {
            $.ajax({
                url: this.settings.url
            }).done(function (data) {
                $.Calculator.RawSource = data;
                $($.Calculator.settings.modalTextarea).val(data);
                $.Calculator.ParseRawData();
            });
        },

        this.ParseRawData = function (needInit) {
            this.RawSource.split("\n").forEach(el => {
                if (el.trim().length == 0) return;

                let element = el.split(";");
                let id = element[0];

                if (id == "" || id == null || id.indexOf("–") > -1 || id.indexOf("-") > -1) { }
                else {
                    let text = element[1].trim().replace("\"", "");
                    let suly = parseFloat(element[2]);
                    let infla = element[3].trim();
                    let subID1 = id.substring(0, 1);
                    let subID2 = id.substring(0, 2);
                    let obj = {
                        title: text,
                        infla: infla,
                        suly: suly,
                        key: id
                    }

                    if ($.Calculator.InflationData.find(x => x.key == subID1) == null)
                        $.Calculator.InflationData.push({ title: "", key: subID1, folder: true, children: [] });

                    if (id.length == 1) {
                        Object.assign($.Calculator.InflationData.find(x => x.key == subID1), obj);
                        return;
                    }

                    if ($.Calculator.InflationData.find(x => x.key == subID1).children.find(x => x.key == subID2) == null)
                        $.Calculator.InflationData.find(x => x.key == subID1).children.push({ title: "", folder: true, key: subID2, children: [] });

                    if (id.length == 2) {
                        Object.assign($.Calculator.InflationData.find(x => x.key == subID1).children.find(x => x.key == subID2), obj);
                        return;
                    }

                    $.Calculator.InflationData.find(x => x.key == subID1).children.find(x => x.key == subID2).children.push({ title: text, key: id, infla: infla, suly: suly });
                }
            });

            if ($.ui.fancytree.getTree($.Calculator.settings.tree) == null)
                $.Calculator.initTree();
        }
        this.GetPlainNuber = function(v){
            let x = parseFloat(v.replace(/[\s\ ]+/g, ""));
            return isNaN(x) ? 0 : x;
        }
    
        this.GetChildSpending = function (node){
            let childSpending = 0; 
            $(this.settings.userSpendings).each(function (e, v) {
                let curNodeKey = $(this).data('node'); 
                if( curNodeKey.substring(0, node.length) == node &&  node != curNodeKey){
                    if($(this).val()!= ""){                     
                        let curspending = $.Calculator.GetPlainNuber($(this).val());
                        switch(curNodeKey.length ){                
                            case 2:
                                let subChildSpending = $.Calculator.GetChildSpending(curNodeKey);                              
                                if($(this).val()!= "" &&  curspending != subChildSpending)
                                    childSpending += curspending  - subChildSpending
                            break;
                            case 3:
                                if ($(this).val() != "" &&  curNodeKey.length > node.length) 
                                    childSpending +=  curspending;
                            break;
                        }
                    }
                }
            });
            return childSpending;
        },
        this.SetNodeSpending = function(node, spending){
            $(this.settings.userSpendings).each(function (e, v) {
                if ($(this).data('node') == node) {
                    $(this).val(spending);
                    $.Calculator.FormatNumber($(this))
                    $(this).effect( "bounce", {
                            distance: 2,
                            times: 1
                    }, 100 );
                } 
            });
        },
        this.GetNodeSpending = function(node){
            let retSpending = 0;
            $(this.settings.userSpendings).each(function (e, v) { 
                if ($(this).data('node') == node && $(this).val() != "") 
                    retSpending = $.Calculator.GetPlainNuber($(this).val());              
            });
            return retSpending;
        }, 
    this.CalcBudget = function () {        
        $($.Calculator.settings.userWeight).each(function(){$(this).text('')});
        $($.Calculator.settings.budget + " tbody").html('')
        let budget = 0.0;
        let checkedBudget = 0;
        let tempData = new Array();
 
        $($(this.settings.userSpendings).get().reverse()).each(function (e, v) {                   
            if($(this).data('node').length < 3){             
                let childSpending =  $.Calculator.GetChildSpending($(this).data('node'));
                let ownSpending = $.Calculator.GetNodeSpending($(this).data('node'));
                if(isNaN(ownSpending)) ownSpending = 0;
                if(ownSpending < childSpending){
                    $.Calculator.SetNodeSpending($(this).data('node'), childSpending)
                }  
            }         
        });
 
        $(this.settings.userSpendings).each(function (e, v) {
            if ($(this).val() != "") {
                let nodeData = $.Calculator.GetInflactionValue($(this).data('node'));
                let val = $.Calculator.GetPlainNuber($(this).val());

                if(nodeData.key.length < 3)
                {
                    let sp = $.Calculator.GetChildSpending(nodeData.key);                    
                    val = Math.max(0, val - sp);
                }

                if ($.ui.fancytree
                    .getTree($.Calculator.settings.tree)
                    .getNodeByKey(nodeData.key).partsel)
                    checkedBudget += val;
                budget += val;
                tempData.push({
                    node: nodeData.key,
                    inf: parseFloat(nodeData.infla),
                    weight: 0,
                    checked: 0,
                    spending: val,
                    text: ''
                });
            }
        });

        //lets recalc the groups
        //1 if a group is filled without children filled, then we are fine
        //2 if a group is filled with children filled: - IS it smaller than the child sum? -> y -> round up group but ignore its inflation
        //                                                                                    n -> the group should be sum() - value 
        //3 if a group is not filled and children are, then calc the group but dont use its value.
    /*    tempData.forEach(x => {
            if(x.node.length == 3){ 
                let p =[ x.node.substring(0,1), x.node.substring(0,2) ];
                p.forEach(y => {
                    let childSpending =  $.Calculator.GetChildSpending(y);
                    let yData = tempData.find(q => q.node == y);
                    let ownSpending = $.Calculator.GetNodeSpending(y);
                    
                    if(ownSpending < childSpending){
                        $.Calculator.SetNodeSpending(y, childSpending)
                    }

                    if(yData == null)
                    {    
                        yData = {
                            node: y,
                            inf: $.ui.fancytree
                            .getTree($.Calculator.settings.tree)
                            .getNodeByKey(y).data.infla,
                            weight: 0,
                            checked: 0,
                            spending: childSpending,
                            text: ''
                        };
                        tempData.push(yData);                         
                    }
                    else {
                        yData.spending = ownSpending < childSpending ? childSpending : ownSpending;
                    }
                   
                });
            }
            
        });
*/
        let untouchedBudget = budget;
        let ubudget = $($.Calculator.settings.userBudget);
        if (ubudget.data('manuallyChanged') == 0) {
            ubudget.val(budget);
            $.Calculator.FormatNumber(ubudget)
        }
        else {
            budget = $.Calculator.GetPlainNuber($($.Calculator.settings.userBudget).val());
        }

        let checkedInflaHelper = 0;
        let InflaHelper = 0;


        tempData.forEach(x => {
            x.weight = $.Calculator.kshRound(100 * x.spending / budget, 2);
            let nodeEach = $.ui.fancytree
                .getTree($.Calculator.settings.tree)
                .getNodeByKey("" + x.node + "");
            x.text = nodeEach.title;
            x.checked = nodeEach.partsel ? 1 : 0;

            InflaHelper += x.weight / 100 * x.inf;
            if (x.checked) {
                checkedInflaHelper += (Math.round(10 * x.spending / checkedBudget) / 10) * x.inf;
            }

            $(nodeEach
                .tr)
                .find($.Calculator.settings.userWeight)
                .text(this.kshRound(x.weight, 2))

            let newrow = $($.Calculator.settings.budget)
                .find('.clone')
                .clone();

            newrow
                .removeClass('clone')
                .show();

            newrow.find('td')
                .eq(0)
                .html("<a onclick='$.Calculator.ScrollToNode(" + x.node + ")'>" + x.text + "</a>");

            newrow.find('td')
                .eq(1)
                .html(x.spending);

            $.Calculator.FormatNumber(newrow.find('td').eq(1), 1)

            newrow.find('td')
                .eq(2)
                .html(this.kshRound(x.weight, 2));

            newrow.find('td')
                .eq(3)
                .html(x.inf);

            $($.Calculator.settings.budget + " tbody")
                .append(newrow)

        });


        $('#inflacio3').html(this.kshRound(InflaHelper, 1))
        $('#inflacio4').html(this.kshRound(checkedInflaHelper, 1))

        $('#inflacio5').html(this.kshRound(((InflaHelper / 100) - 1) * untouchedBudget, 0))
        $('#inflacio6').html(this.kshRound(((checkedInflaHelper / 100) - 1) * checkedBudget, 0))
        
        $.Calculator.FormatNumber($('#inflacio5'), 1)        
        $.Calculator.FormatNumber($('#inflacio6'), 1)
    },
        this.CalcKshInflations = function () {
            let fullWeight = 0;
            let fullInf = 0;
            let CheckedWeight = 0;
            let CheckedInf = 0;
            $.ui.fancytree.getTree($.Calculator.settings.tree).visit(function (node) {
                if (node.key.length == 3) {
                    if (node.partsel) {
                        CheckedWeight += node.data.suly;
                        CheckedInf += node.data.suly * parseFloat(node.data.infla)
                    }

                    fullInf += node.data.suly * parseFloat(node.data.infla)
                    fullWeight += node.data.suly;
                }
                return node;
            });

            let kshInflation = this.kshRound(fullInf / fullWeight, 1);
            let kshCheckedInflation = this.kshRound(fullInf / fullWeight, 1);
            $('#inflacio1').html(kshInflation);
            $('#inflacio2').html(kshCheckedInflation);

        }

    this.init()



}(jQuery));