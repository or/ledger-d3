Date.prototype.addDays = function(days) {
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
};

if (!Array.prototype.last) {
    Array.prototype.last = function() {
        if (this.length == 0) {
            return null;
        }
        return this[this.length - 1];
    };
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

    var line = d3.line()
        .curve(d3.curveMonotone)
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });

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
    svg.call(zoom);

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
                {name: "none", icon: "="},
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
            rebuildData: true,
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

    function aggregateDate(x) {
        if (optionIs("aggregation", "week")) {
            return x.addDays(-(x.getDay() + 7 - 1) % 7);
        } else if (optionIs("aggregation", "month")) {
            return x.addDays(-x.getDate() + 1);
        }

        return x;
    }

    graphObj.buildData = function() {
        var commodityMap = {};
        var lastX = null;
        var minX = null, maxX = null;

        rawData.forEach(function(d) {
            if (!(d.commodity in commodityMap)) {
                commodityMap[d.commodity] = {
                    key: d.commodity,
                    minY: null,
                    maxY: null,
                    running_sum: 0,
                    values: []
                };
            }
            var commodity = commodityMap[d.commodity];

            d.date = new Date(d.date);
            d.amount = parseFloat(d.amount);

            var x = d.date;
            if (minX === null || x < minX) {
                minX = x;
            }
            if (maxX === null || x > maxX) {
                maxX = x;
            }

            x = aggregateDate(x);

            var last = commodity.values.last();
            if (optionIs("aggregation", "none") ||
                last === null ||
                day(last.x) != day(x)) {

                var y = 0;
                if (last !== null && optionIs("function", "cumulative")) {
                    y = last.y;
                }

                last = {
                    x: x,
                    y: y,
                    transactions: []
                };
                commodity.values.push(last);
            }

            last.y += d.amount;
            last.transactions.push(d);

            commodity.running_sum += d.amount;

            if (commodity.minY === null || commodity.running_sum < commodity.minY) {
                commodity.minY = commodity.running_sum;
            }
            if (commodity.maxY === null || commodity.running_sum > commodity.maxY) {
                commodity.maxY = commodity.running_sum;
            }

            lastX = last.x;
        });

        Object.values(commodityMap).forEach(function(commodity) {
            if (commodity.values.length == 0) {
                // should be impossible, as at least one element is added
                return;
            }

            var x = commodity.values[0].x;
            var i = 0;
            while (x <= maxX) {
                var aggregatedX = aggregateDate(x);
                var foundOne = false;
                while (i < commodity.values.length &&
                       day(commodity.values[i].x) == day(aggregatedX)) {
                    ++i;
                    foundOne = true;
                }

                if (!foundOne) {
                    var y = 0;
                    var last = null;
                    if (i > 0) {
                        last = commodity.values[i - 1];
                    }
                    if (last !== null && optionIs("function", "cumulative")) {
                        y = last.y;
                    }
                    commodity.values.splice(i, 0, {
                        x: aggregatedX,
                        y: y,
                        transactions: []
                    });

                    ++i;
                }
                x = x.addDays(1);
            }
        });

        data = Object.values(commodityMap);
        console.log(data);

        // TODO: this will be based on exchange rates to the selected base curency
        var minY = commodityMap["ZAR"].minY;
        var maxY = commodityMap["ZAR"].maxY;
        var xRange = [minX, maxX];
        var yRange = [minY, maxY];

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
    };

    graphObj.update = function() {
        if (data === null) {
            return;
        }

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

        requireFade = false;
    };

    graphObj.onResize();

    graphObj.load("/data/assets.json");

    return graphObj;
}
