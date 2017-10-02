Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};

function load() {
    var width;
    var height;
    var graph_element_id = "#graph";

    var svg = d3.select(graph_element_id).append("svg");
    var graph = svg.append("g").attr("class", "graph");
    var optionLayer = svg.append("g").attr("class", "option-layer");
    var rawData = null;
    var data = null;
    var requireFade = false;

    var x = d3.scaleTime();
    var y = d3.scaleLinear();

    var xAxis = d3.axisBottom(x)
        .ticks(d3.timeMonth.every(1))
        .tickFormat(d3.timeFormat("%b %Y"));
    var yAxis = d3.axisLeft(y);
    var gX = svg
        .append("g")
        .attr("class", "axis axis-x");
    var gY = svg.append("g")
        .attr("class", "axis axis-y");

    var day = d3.timeFormat("%Y-%m-%d");
    var oldGraphIndex = null;

    var t = d3.transition()
        .duration(700)
        .ease(d3.easeLinear);

    function getYValue(d) {
        if (optionIs("function", "cumulative")) {
            return d.cumulative_sum;
        } else {
            return d.amount;
        }
    }

    var line = d3.line()
        .curve(d3.curveMonotone)
        .x(function(d) { return x(d.aggregatedDate); })
        .y(function(d) { return y(getYValue(d)); });

    var lastZoomTransform = null;

    function zoomed() {
        graph.attr("transform", d3.event.transform);

        lastZoomTransform = d3.event.transform;
        gX.call(xAxis.scale(d3.event.transform.rescaleX(x)));
        gY.call(yAxis.scale(d3.event.transform.rescaleY(y)));
    }

    var minZoom = 0.5;
    var zoom = d3.zoom()
        .on("zoom", zoomed);

    var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    var graphObj = {};

    var colorRange =  [
        "#1395ba",
        "#c02e1d",
        "#f16c20",
        "#ebc844",
        "#a2b86c",
        "#0d3c55",
    ];
    colorRange = colorRange.concat(d3.schemeCategory20c);
    var colorIndex = 0;
    var colorMap = {};

    var optionGroups = [
        {
            x: 20,
            y: 40,
            name: "mode",
            align: "left",
            value: "line",
            rebuildData: true,
            requireFade: true,
            options: [
                {name: "line", icon: "\uf201"},
                {name: "bar", icon: "\uf1fe"},
                {name: "stack", icon: "\uf1fe"}
            ]
        },
        {
            x: 110,
            y: 40,
            name: "aggregation",
            align: "left",
            value: "day",
            rebuildData: true,
            requireFade: true,
            options: [
                {name: "day", icon: "\uf271"},
                {name: "week", icon: "\uf271"},
                {name: "month", icon: "\uf272"}
            ]
        },
        {
            x: 200,
            y: 40,
            name: "smoothing",
            align: "left",
            value: "smooth",
            rebuildData: false,
            requireFade: true,
            options: [
                {name: "raw", icon: "\uf272"},
                {name: "smooth", icon: "\uf271"}
            ]
        },
        {
            x: 290,
            y: 40,
            name: "function",
            align: "left",
            value: "cumulative",
            rebuildData: false,
            requireFade: false,
            options: [
                {name: "relative", icon: "="},
                {name: "cumulative", icon: "+"}
            ]
        },
    ];

    function optionIs(name, value) {
        var optionGroup = optionGroups.filter(function(d) { return d.name == name; })[0];
        return optionGroup.value == value;
    }

    function buildOptionGroup(optionGroup) {
        optionGroup.options.forEach(function(d) {
            d.optionGroup = optionGroup;
        });

        var controls = optionLayer.append("g")
            .attr("class", "option-group")
            .attr("opacity", 0)
            .attr("transform", "translate(" + optionGroup.x + "," + optionGroup.y + ")");

        var options = controls.selectAll('.option')
                .data(optionGroup.options)
                .enter()
                .append("g")
                .attr("class", "option")
                .attr("transform", function(d, i) {
                    var y = 15 + i * 20;
                    return "translate(0," + y + ")";
                })
                .on("click", function(d, i) {
                    d.optionGroup.value = d.name;
                    requireFade = d.optionGroup.requireFade;
                    if (d.optionGroup.rebuildData) {
                        graphObj.buildData();
                    }
                    graphObj.update();
                })
        ;

        options.append("text")
            .attr("class", "no-select clickable")
            .attr("text-anchor", function(d) {
                if (d.optionGroup.align == "left") {
                    return "start";
                } else {
                    return "end";
                }
            })
            .attr("font-family", "FontAwesome")
            .text(function(d) { return d.icon; })
        ;

        options.append("text")
            .attr("class", "no-select clickable")
            .attr("x", function(d) {
                if (d.optionGroup.align == "left") {
                    return 20;
                } else {
                    return -20;
                }
            })
            .attr("text-anchor", function(d) {
                if (d.optionGroup.align == "left") {
                    return "start";
                } else {
                    return "end";
                }
            })
            .text(function(d) { return d.name; })
        ;

        optionGroup.controls = controls;
        optionGroup.controlOptions = options;
    };

    optionGroups.forEach(function(o) {
        buildOptionGroup(o);
    });


    var pickColor = function(name) {
        if (!(name in colorMap)) {
            colorMap[name] = colorIndex;
            colorIndex = (colorIndex + 1) % colorRange.length;
        }

        return colorRange[colorMap[name]];
    };

    var oldOnResize = d3.select(window).on("resize");

    d3.select(window).on("resize", function() {
        if (typeof(oldOnResize) != "undefined") {
            oldOnResize();
        }
        graphObj.onResize();
    });

    graphObj.onResize = function() {
        width = $(graph_element_id).width();
        height = $(graph_element_id).height();

        svg.attr("width", width)
            .attr("height", height);

        gY.attr("transform", "translate(" + width + " ,0)");

        graphObj.update();
    };

    graphObj.load = function(path) {
        console.log("load...");
        d3.json(path, function(receivedData) {
            rawData = receivedData;
            graphObj.buildData();
            graphObj.update();
        });
    };

    graphObj.buildData = function() {
        var nameMap = {};
        var lastDate = null;
        rawData.forEach(function(d) {
            if (!(d.commodity in nameMap)) {
                nameMap[d.commodity] = {
                    key: d.commodity,
                    cumulative_sum: 0,
                    last: null,
                    values: []
                };
            }
            var tmp = nameMap[d.commodity];

            d.date = new Date(d.date);

            var aggregatedDate = d.date;
            if (optionIs("aggregation", "week")) {
                aggregatedDate = d.date.addDays(-(d.date.getDay() + 7 - 1) % 7);
            } else if (optionIs("aggregation", "month")) {
                aggregatedDate = d.date.addDays(-d.date.getDate() + 1);
            }

            if (tmp.last == null || day(tmp.last.aggregatedDate) != day(aggregatedDate)) {
                tmp.last = {
                    aggregatedDate: aggregatedDate,
                    amount: 0,
                    cumulative_sum: 0,
                    transactions: []
                };
                tmp.values.push(tmp.last);
            }

            d.amount = parseFloat(d.amount);
            tmp.cumulative_sum += d.amount;
            tmp.last.amount += d.amount;
            tmp.last.cumulative_sum = tmp.cumulative_sum;
            tmp.last.transactions.push(d);
            lastDate = tmp.last.aggregatedDate;
        });

        Object.values(nameMap).forEach(function(d) {
            if (d.last.aggregatedDate < lastDate) {
                d.last = {
                    aggregatedDate: lastDate,
                    amount: 0,
                    cumulative_sum: d.last.cumulative_sum,
                    transactions: []
                };
                d.values.push(d.last);
            }
        });

        data = Object.values(nameMap);
    };

    graphObj.update = function() {
        if (data === null) {
            return;
        }

        var xRange = [
            d3.min(data, function(d) {
                return d3.min(d.values, function(e) {
                    return e.aggregatedDate;
                });
            }),
            d3.max(data, function(d) {
                return d3.max(d.values, function(e) {
                    return e.aggregatedDate;
                });
            })
        ];
        var yRange = [
            d3.min(data, function(d) {
                return d3.min(d.values, getYValue);
            }),
            d3.max(data, function(d) {
                return d3.max(d.values, getYValue);
            })
        ];

        var timelineWidth = (xRange[1] - xRange[0]) / 24 / 60 / 60 / 1000;
        if (timelineWidth < width) {
            timelineWidth = width;
        }

        x.domain(xRange).range([0, timelineWidth]);
        y.domain(yRange).range([height, 0]);

        console.log(xRange, yRange, timelineWidth);

        var zX = x;
        var zY = y;
        if (lastZoomTransform !== null) {
            zX = lastZoomTransform.rescaleX(zX);
            zY = lastZoomTransform.rescaleY(zY);
        }

        gX.transition(t).call(xAxis.scale(zX));
        gY.transition(t).call(yAxis.scale(zY));

        zoom.scaleExtent([minZoom, 40])
            .translateExtent([[(-width - 100) / minZoom, -100 / minZoom],
                              [(timelineWidth + width + 100) / minZoom, (height + 100) / minZoom]]);

        if (optionIs("smoothing", "smooth")) {
            line.curve(d3.curveBasis);
        } else {
            line.curve(d3.curveLinear);
        }

        if (requireFade) {
            if (oldGraphIndex !== null) {
                graph
                    .selectAll(".line.line-" + oldGraphIndex)
                    .transition(t)
                    .attr("opacity", 0)
                    .remove();
            }
        }

        if (oldGraphIndex === null) {
            oldGraphIndex = 0;
        } else {
            if (requireFade) {
                oldGraphIndex = 1 - oldGraphIndex;
            }
        }

        graph.selectAll(".line.line-" + oldGraphIndex)
            .data(data)
            .enter()
            .append("path")
            .style("pointer-events", "none")
            .attr("class", "line line-" + oldGraphIndex)
            .attr("fill", "none")
            .attr("opacity", 0)
            .attr("stroke-width", 1)
            .attr("stroke", function(d) { return pickColor(d.key); })
        ;

        graph
            .selectAll(".line.line-" + oldGraphIndex)
            .data(data)
            .transition(t)
            .attr("opacity", 1)
            .attr("d", function(d) { return line(d.values); })
        ;

        svg.selectAll(".option-group")
            .data(optionGroups)
            .transition(t)
            .attr("opacity", 1)
            .attr("transform", function(d, i) {
                return "translate(" + d.x + "," + d.y + ")";
            })
        ;

        svg.selectAll(".option")
            .data(optionGroups.map(function(d) { return d.options; }).reduce(function(a, b) { return a.concat(b); }))
            .transition(t)
            .style("fill", function(d) {
                if (d.optionGroup.value == d.name) {
                    return "#000000";
                }
                return "#d0d0d0";
            })
        ;

        svg.call(zoom);

        requireFade = false;
    };

    graphObj.onResize();

    graphObj.load("/data/assets.json");

    return graphObj;
}
