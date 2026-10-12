import { GraphQLError, GraphQLScalarType, valueFromASTUntyped } from 'graphql';
import { isJsonValue } from './json.type';
function parseJson(value: unknown) {
	if (!isJsonValue(value)) throw new GraphQLError('Expected a valid JSON value');
	return value;
}
/** Used explicitly on unstructured ER JSON fields; lists of strings use [String]. */
export const JsonScalar = new GraphQLScalarType({
	name: 'AurelisJSON',
	description:
		'A JSON value containing only finite numbers, strings, booleans, arrays, objects, and null.',
	serialize: parseJson,
	parseValue: parseJson,
	parseLiteral: (node, variables) => parseJson(valueFromASTUntyped(node, variables)),
});
