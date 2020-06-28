/* 
  Todo:
      Change datasource rutime? 
         
        design  
        alternating row/column 
       responsive
*/
(function ($) {
    $.Calculator = this;

    this.InflationData = new Array(),
        this.settings = {
            url: "3_6_2h.csv",
            tree: "#tree",
            budget: "#budget",
            userSpendings: ".osszeg",
            userWeight: ".ownWeight",
            userBudget: "#havikeret",
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
            var input = input.replace(/[\D\s\._\-a-zA-Z]+/g, "");
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
            })

            $(document).on("keyup", "" + $.Calculator.settings.userBudget, function () {
                $($.Calculator.settings.userBudget).data('manuallyChanged', $($.Calculator.settings.userBudget).val() == "" ? 0 : 1);
                $.Calculator.CalcBudget();
            });

            $(document).on("keyup", $.Calculator.settings.userSpendings, function (event) {
                $.Calculator.CalcBudget();
            });
        },
        this.getSelectedNodes = function () {
            return $.map($.ui.fancytree.getTree($.Calculator.settings.tree).getSelectedNodes(), function (node) {
                if (node.key.length == 3) return node;
            });
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

                    if (node.key.length > 2)
                        $tdList
                            .eq(4)
                            .find("input")
                            .data('node', node.key);
                    else
                        $tdList
                            .eq(4)
                            .find("input")
                            .hide();
                }
            });
        },

        this.loadData = function () {
            $.ajax({
                url: this.settings.url
            }).done(function (data) {
                data.split("\n").forEach(el => {
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
                $.Calculator.initTree();
            });
        },

        this.CalcBudget = function () {
            $($.Calculator.settings.budget + " tbody").html('')
            let budget = 0.0;
            let checkedBudget = 0;
            let tempData = new Array();
            $(this.settings.userSpendings).each(function (e, v) {
                if ($(this).val() != "") {
                    let nodeData = $.Calculator.GetInflactionValue($(this).data('node'));
                    let val = parseFloat($(this).val().replace(/[\s\ ]+/g, ""));
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

            let ubudget = $($.Calculator.settings.userBudget);
            if (ubudget.data('manuallyChanged') == 0) {
                ubudget.val(budget);
                $.Calculator.FormatNumber(ubudget)
            }
            else {
                budget = $($.Calculator.settings.userBudget).val();
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

            $('#inflacio5').html(this.kshRound(((InflaHelper / 100) - 1) * budget, 1))
            $('#inflacio6').html(this.kshRound(((checkedInflaHelper / 100) - 1) * checkedBudget, 1))

            $.Calculator.FormatNumber($('#inflacio5'), 0)
            $.Calculator.FormatNumber($('#inflacio6'), 0)
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