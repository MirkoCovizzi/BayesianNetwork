let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let container = document.getElementById('graph');
let network = new vis.Network(container, {nodes: nodes, edges: edges}, {});

function delete_node(node_id) {
    let to_edges = get_to_edges_from_node(node_id);
    let from_edges = get_from_edges_to_node(node_id);
    for (const e in to_edges) {
        delete_edge(to_edges[e]);
    }
    for (const e in from_edges) {
        delete_edge(from_edges[e]);
    }
    nodes.remove(node_id);
}

function delete_edge(edge_id) {
    let edge = edges.get(edge_id);
    let node_id = edge.from;
    let to_id = edge.to;
    let to_node = nodes.get(to_id);
    if (to_node !== null) {
        let index = to_node.probability.given.indexOf(node_id.toString());
        to_node.probability.given.splice(index, 1);
        update_probabilities(to_id);
    }
    edges.remove(edge_id);
}

function update_probabilities(node_id) {
    let node = nodes.get(node_id);
    let new_table = [];
    let index_arrays = generate_index_arrays(node_id);
    for (const i_array in index_arrays) {
        new_table.push(1 / node.domain.length);
    }
    node.probability.table = new_table;
}

function get_probability_cursor(node_id, index_array) {
    /*
    This function takes the Node ID and an index array, for example [0, 0, 1] means that I want the
    cursor of the probability in which the first given is True, the second given is True and the Node, whose ID is specified,
    is False (if all of the three nodes have domains (True, False).
     */
    let node = nodes.get(node_id);
    let given = node.probability.given;
    let cursor = 0;
    for (const i in index_array) {
        let index = parseInt(index_array[i]);
        if (i == index_array.length - 1) {
            cursor += index;
        } else {
            let g_id = given[i];
            let g2_id;
            let g2_node;
            let combs_g_fwd = 1;
            for (const g2 in given) {
                g2_id = given[g2];
                g2_node = nodes.get(g2_id);
                if (g2_id > g_id) {
                    combs_g_fwd *= g2_node.domain.length;
                }
            }
            combs_g_fwd *= node.domain.length;
            cursor += index * combs_g_fwd;
        }
    }
    return cursor;
}

function get_probability(node_id, index_array) {
    /*
    After getting the cursor, get the probability by moving to the offset in the linear array which contains the
    probabilities.
     */
    let cursor = get_probability_cursor(node_id, index_array);
    let node = nodes.get(node_id);
    return node.probability.table[cursor];
}

function set_probability(node_id, index_array, value) {
    /*
    After getting the cursor, get the probability by moving to the offset in the linear array which contains the
    probabilities.
     */
    let cursor = get_probability_cursor(node_id, index_array);
    let node = nodes.get(node_id);
    node.probability.table[cursor] = value;
    return true;
}

function generate_index_arrays(node_id) {
    /*
    This function generates all the index arrays for the specified Node. The way it works is by first considering the
    domains of all the Given Nodes (the source nodes) and then generating, in the correct logical order, all the
    possible combinations of indexes.
    This functions works through iteration and not recursion.

    Example:

    Domains:
    Node 1: (T, F)
    Node 2: (T, F)
    Node 3: (A, B, C)

    Output:
    [0, 0, 0]
    [0, 0, 1]
    [0, 0, 2]
    [0, 1, 0]
    [0, 1, 1]
    [0, 1, 2]
    [1, 0, 0]
    [1, 0, 1]
    ...
     */
    let node = nodes.get(node_id);
    let given = node.probability.given;
    let g_id;
    let g_node;
    let index_arrays = [];
    let combs = 1;
    for (const g in given) {
        g_id = given[g];
        g_node = nodes.get(g_id);
        combs *= g_node.domain.length;
    }
    combs *= node.domain.length;
    for (let i = 0; i < combs; i++) {
        index_arrays.push([]);
    }
    for (const g in given) {
        g_id = given[g];
        g_node = nodes.get(g_id);
        let g2_id;
        let g2_node;
        let combs_g_fwd = 1;
        let combs_g_bwd = 1;
        for (const g2 in given) {
            g2_id = given[g2];
            g2_node = nodes.get(g2_id);
            if (g2 > g) {
                combs_g_fwd *= g2_node.domain.length;
            }
            if (g2 < g) {
                combs_g_bwd *= g2_node.domain.length;
            }
        }
        combs_g_fwd *= node.domain.length;
        for (let times = 0; times < combs_g_bwd; times++) {
            for (const d in g_node.domain) {
                for (let i = 0; i < combs_g_fwd; i++) {
                    index_arrays[times * combs_g_fwd * g_node.domain.length + parseInt(d) * combs_g_fwd + i].push(parseInt(d));
                }
            }
        }
    }

    let tot_times = combs / node.domain.length;
    for (let times = 0; times < tot_times; times++) {
        for (const d in node.domain) {
            index_arrays[times * node.domain.length + parseInt(d)].push(parseInt(d));
        }
    }
    return index_arrays;
}

function get_nodes_indip()
{
    /*
    By checking how many given (source) nodes each node has, we can know which nodes are indipendent.
     */
    let indip = [];
    for (const e in nodes._data) {
        if (nodes._data[e].probability.given.length == 0)
            indip.push(e);
    }
    return indip;
}

function color_nodes_indip()
{
    let nodes_indip = get_nodes_indip();
    let node;
    for (const i in nodes_indip) {
        let id = nodes_indip[i];
        node = nodes.get(id);
        node.color.background = "orange";
        nodes.update(node);
    }
}

function get_id_from_label_node(string)
{
    for (const e in nodes._data) {
        if (nodes._data[e].label === string) {
            return e;
        }
    }
}

function get_id_from_label_edges(from, to)
{
    let from_id = get_id_from_label_node(from);
    let to_id = get_id_from_label_node(to);
    for (const e in edges._data) {
        if (edges._data[e].from == from_id && edges._data[e].to == to_id)
            return e;
    }
}

function get_to_edges_from_node(node_id) {
    let ret_edges = [];
    for (const e in edges._data) {
        if (edges._data[e].from == node_id) {
            ret_edges.push(e);
        }
    }
    return ret_edges;
}

function get_from_edges_to_node(node_id) {
    let ret_edges = [];
    for (const e in edges._data) {
        if (edges._data[e].to == node_id) {
            ret_edges.push(e);
        }
    }
    return ret_edges;
}

function hide_error_success() {
    $("#error_dialog").hide();
    $("#success").hide();
}

$("#button_new").click(function() {
    nodes.clear();
    edges.clear();
});

$("#button_open_file_hidden").change(function() {
    /*
    Hidden button to use for opening a file window, to open an .xml file containing a graph using the XMLBIF format.
     */
    let file = $(this)[0].files[0];
    $("#fileName").text(file.name);

    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        alert('The File APIs are not fully supported in this browser.');
        return;
    }

    let fr;
    fr = new FileReader();
    fr.onload = receivedText;
    fr.readAsText(file);

    function receivedText() {
        let xmlbif = fr.result;
        let xmlDoc = $.parseXML(xmlbif);
        let $xml = $(xmlDoc);
        load_network($xml);
    }
});

$("#button_save_file").click(function() {
    /*
    Function to query the server to generate a valid XMLBIF file to be saved from the current network.
     */
    let request_data = {};
    request_data.nodes = nodes._data;
    console.log(request_data);
    $.ajax({
        url: 'http://localhost:5000/save_network',
        type: 'post',
        crossDomain: true,
        dataType: 'json',
        contentType: 'application/json',
        success: function (response) {
            console.log(response.xml);
            var blob = new Blob([response.xml], {type: 'text/xml'});
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveBlob(blob, "graph.xml");
            } else {
                var elem = window.document.createElement('a');
                elem.href = window.URL.createObjectURL(blob);
                elem.download = "graph.xml";
                document.body.appendChild(elem);
                elem.click();
                document.body.removeChild(elem);
            }
        },
        data: JSON.stringify(request_data)
    });

});

function load_network(xml){
    /*
    Function that parses the XMLBIF file and generates the corresponding network
     */
    nodes.clear();
    edges.clear();

    let center_x = 0;
    let center_y = 0;

    let variables = xml.find('VARIABLE');
    variables.each(function(i){
        let variable = {};

        variable.id = i;
        variable.name = $(this).find('NAME').text();

        variable.domain = [];
        let domain = $(this).find('OUTCOME');
        domain.each(function(){
            let value = $(this).text();
            variable.domain.push(value);
        });

        let pos = {};
        let position = $(this).find('PROPERTY').text();
        position = position.split("(")[1];
        position = position.split(",");
        pos.x = position[0];
        position = position[1].split(" ").join("");
        pos.y = position.split(")")[0];

        let x, y;
        if (center_x === 0 && center_y === 0) {
            x = 0;
            y = 0;
            center_x = pos.x;
            center_y = pos.y;
        } else {
            x = pos.x - center_x;
            y = pos.y - center_y;
        }

        nodes.add({
            id: variable.id,
            label: variable.name,
            x: x,
            y: y,
            domain: variable.domain,
            color: {background: "", border: "black"},
        });
    });

    let edge_counter = 0;
    let probabilities = xml.find('DEFINITION');
    probabilities.each(function(){
        let target_node_id = get_id_from_label_node($(this).find('FOR').text());

        let given_nodes_id = [];
        $(this).find('GIVEN').each(function(){
            let given = $(this).text();
            let given_node_id = get_id_from_label_node(given);
            given_nodes_id.push(given_node_id);
        });

        for (const from in given_nodes_id) {
            edges.add({
                id: edge_counter,
                from: given_nodes_id[from],
                to: target_node_id,
                arrows: 'to'
            });
            edge_counter++;
        }

        let probability_table = $(this).find('TABLE').text().split(" ");

        let node = nodes._data[target_node_id];
        node.probability = {};
        node.probability.given = given_nodes_id;
        node.probability.table = probability_table;
    });
}

function save_network(){
}

network.on( 'click', function(properties) {
	let option_selected = $("#name_choice").text();

	hide_error_success();

	if(option_selected === "Set Properties" && properties.nodes.length === 1)
	{
        let node = nodes.get(properties.nodes[0]);
        $("#label_selected").val(node.label);
        $("#domain_selected").val(node.domain);
        $("#set_properties_id").val(node.id);
    }
    else if(option_selected === "Probability Table")
    {
        if (properties.nodes.length !== 0) {
            let node = nodes.get(properties.nodes[0]);
            create_dynamic_probability_table(node.id);
        }
    }
    else if(option_selected === "Delete Node" && properties.nodes.length === 1)
    {
        let node = nodes.get(properties.nodes[0]);
        delete_node(node.id);
        $("#success").show();
    }
    else if(option_selected === "Delete Edge" && properties.edges.length === 1 && properties.nodes.length === 0)
    {
        let edge = nodes.get(properties.edges[0]);
        delete_edge(edge.id);
        $("#success").show();
    }
});

$("#button_create_node").click(function() {
    $("#error_dialog").hide();
    $("#success").hide();
    $("#name_choice").text("Create Node");
    $("#div_create_edge").hide();
    $("#div_delete_node").hide();
    $("#div_delete_edge").hide();
    $("#div_set_properties").hide();
    $("#div_probability_table").hide();
    $("#div_query").hide();
    $("#help_message").hide();
    $("#div_create_nodes").show();
});

$("#button_create_edge").click(function() {
    $("#error_dialog").hide();
    $("#success").hide();
    $("#name_choice").text("Create Edge");
    $("#div_create_nodes").hide();
    $("#div_delete_node").hide();
    $("#div_delete_edge").hide();
    $("#div_set_properties").hide();
    $("#div_probability_table").hide();
    $("#div_query").hide();
    $("#help_message").hide();
    $("#div_create_edge").show();
});

$("#button_delete_node").click(function() {
    $("#error_dialog").hide();
    $("#success").hide();
    $("#name_choice").text("Delete Node");
    $("#div_create_nodes").hide();
    $("#div_delete_edge").hide();
    $("#div_set_properties").hide();
    $("#div_create_edge").hide();
    $("#div_probability_table").hide();
    $("#div_query").hide();
    $("#help_message").hide();
    $("#div_delete_node").show();
});

$("#button_delete_edge").click(function() {
    $("#error_dialog").hide();
    $("#success").hide();
    $("#name_choice").text("Delete Edge");
    $("#div_create_nodes").hide();
    $("#div_set_properties").hide();
    $("#div_create_edge").hide();
    $("#div_delete_node").hide();
    $("#div_probability_table").hide();
    $("#div_query").hide();
    $("#help_message").hide();
    $("#div_delete_edge").show();
});

$("#button_set_properties").click(function() {
    $("#error_dialog").hide();
    $("#success").hide();
    $("#name_choice").text("Set Properties");
    $("#div_create_nodes").hide();
    $("#div_create_edge").hide();
    $("#div_delete_node").hide();
    $("#div_delete_edge").hide();
    $("#div_probability_table").hide();
    $("#div_query").hide();
    $("#help_message").hide();
    $("#div_set_properties").show();
});

$("#button_probability_table").click(function() {
    $("#success").hide();
    $("#error_dialog").hide();
    $("#name_choice").text("Probability Table");
    $("#div_create_nodes").hide();
    $("#div_create_edge").hide();
    $("#div_delete_node").hide();
    $("#div_delete_edge").hide();
    $("#div_set_properties").hide();
    $("#div_query").hide();
    $("#help_message").hide();
    $("#div_probability_table").show();

    color_nodes_indip();
});

$("#button_query").click(function() {
    $("#error_dialog").hide();
    $("#success").hide();
    $("#name_choice").text("Compute Query");
    $("#div_create_nodes").hide();
    $("#div_delete_node").hide();
    $("#div_delete_edge").hide();
    $("#div_set_properties").hide();
    $("#div_probability_table").hide();
    $("#div_create_edge").hide();
    $("#help_message").hide();
    $("#div_query").show();

    create_dynamic_observations();
});

$("#save_create_node").click(function() {
    hide_error_success();
    let label = $("#label").val();
    let domain = $("#domain").val();

    if(label === "" || domain === "" || domain.toString().split(',').length < 2 || domain.slice(-1) === "," || get_id_from_label_node(label))
        $("#error_dialog").show();
    else {
        let max_id;
        if (nodes.length == 0) {
            max_id = -1;
        } else {
            max_id = Math.max(...Object.keys(nodes._data));
        }
        let dom = domain.split(',');
        let table = [];
        for (const i in dom) {
            table.push(1 / dom.length);
        }
        nodes.add({
            id: max_id + 1,
            label: label,
            domain: dom,
            probability: {given: [], table: table},
            color: {background: "", border: "black"},
        });
        $("#error_dialog").hide();
        $("#success").show();
    }
});

$("#save_create_edge").click(function() {
    hide_error_success();

    let from = $("#from").val();
    let to = $("#to").val();

    if (!get_id_from_label_node(from) ||
        !get_id_from_label_node(to) ||
        get_id_from_label_edges(from, to))
        $("#error_dialog").show();
    else
    {
        let max_id;
        if (edges.length == 0) {
            max_id = -1;
        } else {
            max_id = Math.max(...Object.keys(edges._data));
        }
        let from_id = get_id_from_label_node(from);
        let to_id = get_id_from_label_node(to);
        edges.add({
            id: max_id + 1,
            from: parseInt(from_id),
            to: parseInt(to_id),
            arrows: 'to'
        });
        let to_node = nodes.get(to_id);
        to_node.probability.given.push(from_id);
        update_probabilities(to_id);
        $("#error_dialog").hide();
        $("#success").show();
    }
});

$("#save_delete_node").click(function() {
    hide_error_success();

    let delete_node = $("#delete_node").val();

    let id = get_id_from_label_node(delete_node);

    if(!id)
    	$("#error_dialog").show();
    else
    {
        delete_node(id);
        $("#error_dialog").hide();
        $("#success").show();
    }
});

$("#save_delete_edge").click(function() {
    hide_error_success();

    let from = $("#delete_from").val();
    let to = $("#delete_to").val();

    let id = get_id_from_label_edges(from, to);

    if (!get_id_from_label_node(from) ||
        !get_id_from_label_node(to) ||
        get_id_from_label_edges(from, to))
        $("#error_dialog").show();
    else
    {
        delete_edge(id);
        $("#error_dialog").hide();
        $("#success").show();
    }
});

$("#save_set_properties").click(function() {
    let id = $("#set_properties_id").val();
    let new_label = $("#label_selected").val();
    let new_domain = $("#domain_selected").val().split(",");

    if (new_label === "" || new_domain.toString().split(',').length < 2 || new_domain.slice(-1)===","){
        $("#success").hide();
        $("#error_dialog").show();
    } else {
        let node = nodes.get(id);
        node.label = new_label;
        node.domain = new_domain;
        nodes.update(node);
        $("#error_dialog").hide();
        $("#success").show();
    }
});

$("#compute_query").click(function() {
    /*
    Function that queries the server in order to compute the marginal for the specified node.
    It also considers observations (evidences) that were set previously in the specific section of the page.
    By default observations are set to "NO" which means they are disabled for every node.
    They are opt-in for every node.
     */
    let request_data = {};
    request_data.observations = {};
    request_data.nodes = nodes._data;
    request_data.edges = edges._data;

    let query_node_name = $("#query_input").val();
    let query_node_id = get_id_from_label_node(query_node_name);
    let query_node = nodes.get(query_node_id);

    if (query_node) {
        $("#observations > div.row").find("div.btn-group").each(function() {
            let choice = $(this).find("label.active > input")[0];
            request_data.observations[this.id] = choice.value;
        });
        request_data.query_node = query_node.id;
        $.ajax({
            url: 'http://localhost:5000/belief_propagation',
            type: 'post',
            crossDomain: true,
            dataType: 'json',
            contentType: 'application/json',
            success: function (response) {
                console.log(response);
                $("#query_result").text(response);
            },
            data: JSON.stringify(request_data)
        });
    }
});

function create_dynamic_probability_table(node_id) {
    let node = nodes.get(node_id);
    let table = "<div id='dynamic_table_div'><table id='dynamic_table' class='table table-hover mt-4'>";
    table += "<thead id='thead'><tr class='table-primary text-center'>";
    let str;
    if (node.probability.given.length == 0) {
        for (const i in node.domain) {
            str = node.label + " (" + node.domain[i] + ")";
            table += "<th><strong>" + str + "</strong></th>";
        }
        table += "</tr></thead><tbody>";
        table += "<tr class='table-dark text-center'>";
        for (let i = 0; i < node.domain.length; i++) {
            str = "<input name=" + i + " style='text-align: center' value=" + node.probability.table[i] + ">";
            table += "<td>" + str + "</td>";
        }
    } else {
        let node_from;
        for (const i in node.probability.given) {
            node_from = nodes.get(node.probability.given[i]);
            table += "<th><strong>" + node_from.label + "</strong></th>";
        }
        for (const i in node.domain) {
            str = node.label + " (" + node.domain[i] + ")";
            table += "<th><strong>" + str + "</strong></th>";
        }
        table += "</tr></thead><tbody>";
        let prob = generate_index_arrays(node.id);
        let skipper = node.domain.length - 1;
        for (const p in prob) {
            if (skipper == node.domain.length - 1) {
                table += "<tr class='table-dark text-center'>";
                let index = prob[p];
                index.pop();
                for (const element in index) {
                    let node_id = node.probability.given[element];
                    let node_id_domain = nodes.get(node_id).domain;
                    str = node_id_domain[index[element]];
                    table += "<td><strong>" + str + "</strong></td>";
                }
                for (const d in node.domain) {
                    index.push(parseInt(d));
                    let prob_value = get_probability(node.id, index);
                    let name = index.join(',');
                    table += "<td><input name=" + name + " style='text-align: center' value=" + prob_value + "></td>";
                    index.pop();
                }
            }
            skipper--;
            if (skipper == -1) {
                skipper = node.domain.length - 1;
            }
        }
    }
    table += "</tbody></table></div>";
    let button = '<button id="button_update_probabilities" type="button" class="btn btn-primary mt-3" onclick="check_and_update_probabilities(' + node_id + ')">Update Probabilities</button>';
    $("#div_probability_table").html(table);
    $("#div_probability_table").append(button);
}

function check_and_update_probabilities(node_id) {
    let not_valid = 0;
    $("#dynamic_table > tbody").find('tr').each(function() {
        let values = [];
        $(this).find('input').each(function() {
            values.push(this.value);
        });
        let tot = 0;
        for (let i = 0; i < values.length; i++) {
            tot += parseFloat(values[i]);
        }
        if (tot !== 1)
            not_valid += 1;
    });
    if (not_valid == 0) {
        $("#dynamic_table > tbody").find('tr').each(function() {
            $(this).find('input').each(function() {
                let value = this.value;
                let array = $(this).attr('name').split(',');
                set_probability(node_id, array, parseFloat(value));
            });
        });
        $("#success").show();
        $("#error_dialog").hide();
    } else {
        $("#success").hide();
        $("#error_dialog").show();
    }
}

function create_dynamic_observations() {
    function get_html_group(content, node_id) {
        return '<div id="' + node_id + '" class="btn-group btn-group-toggle" data-toggle="buttons">' + content + '</div>';
    }

    function get_html_row(content) {
        return '<div class="row">' + content + '</div>';
    }

    function get_html_col_6(content) {
        return '<div class="col-6">' + content + '</div>';
    }

    function get_html_col_3(content) {
        return '<div class="col-3">' + content + '</div>';
    }

    function get_html_name(node_name) {
        return '<div class="form-check form-check-inline"><label class="form-check-label">' + node_name + ': ' + '</label></div>'
    }

    function get_html_option(option, label) {
        return '<label class="btn btn-secondary"><input name="options" type="radio" value="' + option + '">' + label + '</label>';
    }

    function get_html_choose() {
        return '<label class="btn btn-danger active"><input name="options" type="radio" value="-1">NO</label>';
    }

    let html_out = "";

    let node;
    for (const n in nodes._data) {
        let html = "";
        node = nodes.get(n);
        let name = get_html_name(node.label);
        let options = "";
        for (const d in node.domain) {
            options += get_html_option(d, node.domain[d]);
        }
        let choose = get_html_choose();
        let opt = get_html_group(options + choose, node.id);
        html += get_html_col_3(name);
        html += get_html_col_6(opt);
        html_out += get_html_row(html);
    }

    $("#observations").html(html_out);
}