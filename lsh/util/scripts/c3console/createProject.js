/*
 * Copyright 2009-2022 C3 (www.c3.ai). All Rights Reserved.
 * This material, including without limitation any software, is the confidential trade secret and proprietary
 * information of C3 and its licensors. Reproduction, use and/or distribution of this material in any form is
 * strictly prohibited except as set forth in a written license agreement with C3 and/or its authorized distributors.
 * This material may be covered by one or more patents or pending patent applications.
 */

createProject = function (id, graph) {
    // if project already exists return
    if (ExMachinaProjectRoot.exists({ filter: Filter.eq('id', id) })) {
        return;
    }

    var fakeGraph = { nodeDefinitions:[], groups:[], graphMigrationVersion:1 };
    var id = ExMachinaProjectRoot.create({
        id: id,
        name: id ? id : Date.now().getMillis(),
        kind: ExMachinaProjectKind.STANDARD,
        account: ExMachinaAccount.make({
        id: id,
        kind: ExMachinaAccountKind.PERSONAL
        }),
    }).id

    var project = ExMachinaProject.create({
        root: { id: id },
        definition: graph || fakeGraph,
    });

    ExMachinaProjectRoot.merge({
        id: id,
        currentHead: project,
    });

    var url = "http://localhost:10012/exmac/ui/?project=" + id
    console.log('Project created can be accessed at:', url);
}
