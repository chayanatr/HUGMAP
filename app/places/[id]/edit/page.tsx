// แก้ไขสถานที่ /places/[id]/edit
import PlaceForm from '../../PlaceForm';

export default function EditPlacePage({ params }: { params: { id: string } }) {
  return <PlaceForm placeId={params.id} />;
}
