import { MutationOperation, MutationOperationResults, MutationRequest, MutationResponse, Forbidden, Conflict } from "@hasura/ndc-sdk-typescript";
import { Configuration, State } from "..";


export async function do_mutation(configuration: Configuration, state: State, mutation: MutationRequest): Promise<MutationResponse> {
    let procedures: MutationOperation[] = [];
    let operation_results: MutationOperationResults[] = [];
    for (let op of mutation.operations){
        if (op.type !== "procedure"){
            throw new Forbidden("Not implemented yet.", {});
        } else {
            procedures.push(op);
        }
    }
    for (let procedure of procedures){
        if (procedure.type !== "procedure"){
            throw new Forbidden("Not implemented yet.", {});
        }
        try {
            if (procedure.name.startsWith("insert_") && procedure.name.endsWith("_one")){
                let collection = procedure.name.slice("insert_".length, procedure.name.length - "_one".length);

                if (procedure.arguments.object){
                    let args = procedure.arguments.object as any;
                    let id: number = 0;
                    let vector: (number)[] | ({[key: string]: (number)[] | undefined}) = [];
                    const payload: any = {};
                    for (let field of Object.keys(args)){
                        if (field === "id"){
                            id = args[field];
                        } else if (field === "vector"){
                            vector = args[field];
                        } else {
                            payload[field] = args[field];
                        }
                    }
                    if (vector.length === 0){
                        vector = {};
                        if (args.vectors && args.vector_names){
                            for (let i = 0; i < args.vector_names.length; i++){
                                console.log(args.vector_names[i]);
                                vector[args.vector_names[i]] = args.vectors[i];
                            }
                        }
                    }
                    let existing_point = await state.client.retrieve(collection, {ids: [id]});
                    if (existing_point.length > 0){
                        operation_results.push({
                            type: "procedure",
                            result: [
                                {
                                    __value: "Point already exists!"

                                }
                            ]
                        })
                    } else {
                        let point = await state.client.upsert(collection, {
                            wait: true,
                            points: [
                                {
                                    id: id,
                                    vector: vector,
                                    payload: payload 
                                }
                            ]
                        });
                        operation_results.push({
                            type: "procedure",
                            result: [
                                {
                                    __value: point
                                }
                            ]
                        })
                    }
                }
            } else if (procedure.name.startsWith("upsert_") && procedure.name.endsWith("_one")){
                let collection = procedure.name.slice("upsert_".length, procedure.name.length - "_one".length);
                if (procedure.arguments.object){
                    let args = procedure.arguments.object as any;
                    let id: number = 0;
                    let vector: (number)[] | ({[key: string]: (number)[] | undefined}) = [];
                    const payload: any = {};
                    for (let field of Object.keys(args)){
                        if (field === "id"){
                            id = args[field];
                        } else if (field === "vector"){
                            vector = args[field];
                        } else {
                            payload[field] = args[field];
                        }
                    }
                    if (vector.length === 0){
                        vector = {};
                        if (args.vectors && args.vector_names){
                            for (let i = 0; i < args.vector_names.length; i++){
                                console.log(args.vector_names[i]);
                                vector[args.vector_names[i]] = args.vectors[i];
                            }
                        }
                    }
                    let point = await state.client.upsert(collection, {
                        wait: true,
                        points: [
                            {
                                id: id,
                                vector: vector,
                                payload: payload 
                            }
                        ]
                    });
                    operation_results.push({
                        type: "procedure",
                        result: [
                            {
                                __value: point
                            }
                        ]
                    })
                }
            } else if (procedure.name.startsWith("delete_") && procedure.name.endsWith("_one")){
                let collection = procedure.name.slice("delete_".length, procedure.name.length - "_one".length);
                if (procedure.arguments.id){
                    let id = procedure.arguments.id as string | number;
                    let point = await state.client.delete(collection, {
                        wait: true,
                        points: [
                            id
                        ]
                    });
                    operation_results.push({
                        type: "procedure",
                        result: [
                            {
                                __value: point
                            }
                        ]
                    })
                }
            } else if (procedure.name.startsWith("update_") && procedure.name.endsWith("_one")){
                let collection = procedure.name.slice("update_".length, procedure.name.length - "_one".length);
                if (procedure.arguments.object){
                    let args = procedure.arguments.object as any;
                    let id: number = 0;
                    let vector: (number)[] | ({[key: string]: (number)[] | undefined}) = [];
                    const payload: any = {};
                    for (let field of Object.keys(args)){
                        if (field === "id"){
                            id = args[field];
                        } else if (field === "vector"){
                            vector = args[field];
                        } else {
                            payload[field] = args[field];
                        }
                    }
                    if (vector.length === 0){
                        vector = {};
                        if (args.vectors && args.vector_names){
                            for (let i = 0; i < args.vector_names.length; i++){
                                console.log(args.vector_names[i]);
                                vector[args.vector_names[i]] = args.vectors[i];
                            }
                        }
                    }
                    let existing_point = await state.client.retrieve(collection, {ids: [id]});
                    if (existing_point.length == 0){
                        operation_results.push({
                            type: "procedure",
                            result: [
                                {
                                    __value: "Point does not exist!"

                                }
                            ]
                        })
                    } else {
                        let point = await state.client.upsert(collection, {
                            wait: true,
                            points: [
                                {
                                    id: id,
                                    vector: vector,
                                    payload: payload 
                                }
                            ]
                        });
                        operation_results.push({
                            type: "procedure",
                            result: [
                                {
                                    __value: point
                                }
                            ]
                        })
                    }
                }
            } else if (procedure.name.startsWith("insert_") && procedure.name.endsWith("_many")) {
                let collection = procedure.name.slice("insert_".length, procedure.name.length - "_many".length);
                if (procedure.arguments.objects) {
                    let args = procedure.arguments.objects as any[];
                    let pointsToInsert = args.map(arg => {
                        let id: number = arg.id;
                        let vector: (number)[] | ({[key: string]: (number)[] | undefined}) = arg.vector || [];
                        const payload: any = {};
                        for (let field of Object.keys(arg)) {
                            if (field !== "id" && field !== "vector" && field !== "vectors" && field !== "vector_names") {
                                payload[field] = arg[field];
                            }
                        }
                        if (vector.length === 0){
                            vector = {};
                            if (arg.vectors && arg.vector_names){
                                for (let i = 0; i < arg.vector_names.length; i++){
                                    console.log(arg.vector_names[i]);
                                    vector[arg.vector_names[i]] = arg.vectors[i];
                                }
                            }
                        }
                        return { id, vector, payload };
                    });
                    let existingIds = await state.client.retrieve(collection, { ids: pointsToInsert.map(p => p.id) });
                    let existingIdsSet = new Set(existingIds.map(p => p.id));
                    let newPoints = pointsToInsert.filter(p => !existingIdsSet.has(p.id));
                    let insertResult;
                    if (newPoints.length === pointsToInsert.length) {
                        insertResult = await state.client.upsert(collection, {
                            wait: true,
                            points: newPoints
                        });
                    }
                    operation_results.push({
                        type: "procedure",
                        result: [
                            {
                                __value: insertResult ? insertResult : "No new points inserted. Some or all points may already exist."
                            }
                        ]
                    });
                }
            } else if (procedure.name.startsWith("upsert_") && procedure.name.endsWith("_many")) {
                // Extract the collection name from the procedure name
                let collection = procedure.name.slice("upsert_".length, procedure.name.length - "_many".length);
            
                // Check if the procedure arguments contain the expected array of objects
                if (procedure.arguments.objects) {
                    // Cast the argument to an array of any objects as expected
                    let args = procedure.arguments.objects as any[];
            
                    // Map each argument object to a format suitable for upsert operation
                    let pointsToUpsert = args.map(arg => {
                        let id: number = arg.id; // Extract the id
                        let vector: (number)[] | ({[key: string]: (number)[] | undefined}) = arg.vector || [];
                        const payload: any = {}; // Initialize an empty payload object
            
                        // Populate the payload with fields from arg, excluding 'id' and 'vector'
                        for (let field of Object.keys(arg)) {
                            if (field !== "id" && field !== "vector" && field !== "vectors" && field !== "vector_names") {
                                payload[field] = arg[field];
                            }
                        }
                        if (vector.length === 0){
                            vector = {};
                            if (arg.vectors && arg.vector_names){
                                for (let i = 0; i < arg.vector_names.length; i++){
                                    console.log(arg.vector_names[i]);
                                    vector[arg.vector_names[i]] = arg.vectors[i];
                                }
                            }
                        }
                        // Return a structure suitable for the upsert operation
                        return { id, vector, payload };
                    });
            
                    // Perform the upsert operation using the state client, assuming it supports bulk upsert
                    let upsertResult = await state.client.upsert(collection, {
                        wait: true,
                        points: pointsToUpsert
                    });
            
                    // Push the operation result indicating the number of affected rows and any returning data
                    operation_results.push({
                        type: "procedure",
                        result: [
                            {
                                __value: upsertResult // Use the result of the upsert operation
                            }
                        ]
                    });
                }
            } else if (procedure.name.startsWith("update_") && procedure.name.endsWith("_many")) {
                let collection = procedure.name.slice("update_".length, procedure.name.length - "_many".length);
                if (procedure.arguments.objects) {
                    let args = procedure.arguments.objects as any[];
                    let pointsToInsert = args.map(arg => {
                        let id: number = arg.id;
                        let vector: (number)[] | ({[key: string]: (number)[] | undefined}) = arg.vector || [];
                        const payload: any = {};
                        for (let field of Object.keys(arg)) {
                            if (field !== "id" && field !== "vector" && field !== "vectors" && field !== "vector_names") {
                                payload[field] = arg[field];
                            }
                        }
                        if (vector.length === 0){
                            vector = {};
                            if (arg.vectors && arg.vector_names){
                                for (let i = 0; i < arg.vector_names.length; i++){
                                    console.log(arg.vector_names[i]);
                                    vector[arg.vector_names[i]] = arg.vectors[i];
                                }
                            }
                        }
                        return { id, vector, payload };
                    });
                    let existingIds = await state.client.retrieve(collection, { ids: pointsToInsert.map(p => p.id) });
                    let existingIdsSet = new Set(existingIds.map(p => p.id));
                    let newPoints = pointsToInsert.filter(p => existingIdsSet.has(p.id));
                    let insertResult;
                    if (newPoints.length === pointsToInsert.length) {
                        insertResult = await state.client.upsert(collection, {
                            wait: true,
                            points: newPoints
                        });
                    }
                    operation_results.push({
                        type: "procedure",
                        result: [
                            {
                                __value: insertResult ? insertResult : "No points updated. Some or all points do not exist."
                            }
                        ]
                    });
                } 
            } else if (procedure.name.startsWith("delete_") && procedure.name.endsWith("_many")) {
                let collection = procedure.name.slice("delete_".length, procedure.name.length - "_many".length);
            
                if (procedure.arguments.ids) {
                    let idsToDelete = procedure.arguments.ids as (string | number)[];
            
                    // Perform the batch delete operation
                    let deleteResults = await state.client.delete(collection, {
                        wait: true,
                        points: idsToDelete
                    });
            
                    // Push the operation result
                    operation_results.push({
                        type: "procedure",
                        result: [{
                            __value: deleteResults
                        }]
                    });
                }
            }
        } catch (e) {
            throw new Conflict("An error occured", {error: `${e}`});
        }
    }
    return {
        operation_results: operation_results
    };
}