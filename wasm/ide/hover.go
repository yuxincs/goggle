package ide

import "go/types"

func (service *Service) Hover(params DocumentPosition) (*Hover, error) {
	snapshot, err := service.snapshotFor(params)
	if err != nil {
		return nil, err
	}
	resolved, err := objectAtPosition(snapshot, params.Position)
	if err != nil || resolved == nil {
		return nil, err
	}

	hoverRange, err := rangeForNode(snapshot, resolved.identifier)
	if err != nil {
		return nil, err
	}
	return &Hover{
		Contents: types.ObjectString(resolved.object, types.RelativeTo(snapshot.pkg)),
		Range:    &hoverRange,
	}, nil
}
