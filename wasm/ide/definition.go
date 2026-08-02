package ide

func (service *Service) Definition(params DocumentPosition) (*Location, error) {
	snapshot, err := service.snapshotFor(params)
	if err != nil {
		return nil, err
	}
	resolved, err := objectAtPosition(snapshot, params.Position)
	if err != nil || resolved == nil {
		return nil, err
	}

	definitionPosition, ok := objectPosition(snapshot, resolved.object)
	if !ok || definitionPosition.Filename != snapshot.document.URI {
		return nil, nil
	}
	for identifier, object := range snapshot.info.Defs {
		if object != resolved.object {
			continue
		}
		definitionRange, err := rangeForNode(snapshot, identifier)
		if err != nil {
			return nil, err
		}
		return &Location{
			URI:   snapshot.document.URI,
			Range: definitionRange,
		}, nil
	}
	return nil, nil
}
